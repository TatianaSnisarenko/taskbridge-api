import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findProjectForReport } from '../../db/queries/projects.queries.js';
import { createNotification } from '../notifications/index.js';

export async function reportProject({ userId, persona, projectId, report }) {
  await findProjectForReport(projectId);

  try {
    const created = await prisma.projectReport.create({
      data: {
        projectId,
        reporterUserId: userId,
        reporterPersona: persona,
        reason: report.reason,
        comment: report.comment || '',
      },
      select: { id: true, createdAt: true },
    });

    return { reportId: created.id, createdAt: created.createdAt };
  } catch (error) {
    if (error.code === 'P2002') {
      throw new ApiError(409, 'ALREADY_REPORTED', 'You have already reported this project');
    }
    throw error;
  }
}

export async function getProjectReports({ page = 1, size = 20, status, reason }) {
  const take = Number(size);
  const skip = (Number(page) - 1) * take;

  const where = {};
  if (status) {
    where.status = status;
  }
  if (reason) {
    where.reason = reason;
  }

  const [reports, total] = await prisma.$transaction([
    prisma.projectReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            deletedAt: true,
            ownerUserId: true,
          },
        },
        reporter: {
          select: {
            id: true,
            email: true,
          },
        },
        resolvedBy: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    }),
    prisma.projectReport.count({ where }),
  ]);

  return {
    items: reports,
    page: Number(page),
    size: take,
    total,
  };
}

export async function resolveProjectReport({ userId, reportId, action, note }) {
  const report = await prisma.projectReport.findUnique({
    where: { id: reportId },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          ownerUserId: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!report) {
    throw new ApiError(404, 'NOT_FOUND', 'Report not found');
  }

  if (report.status === 'RESOLVED') {
    throw new ApiError(409, 'ALREADY_RESOLVED', 'Report has already been resolved');
  }

  const resolvedAt = new Date();

  const updatedReport = await prisma.$transaction(async (tx) => {
    if (action === 'DELETE' && !report.project.deletedAt) {
      await tx.project.update({
        where: { id: report.projectId },
        data: {
          deletedAt: resolvedAt,
          status: 'ARCHIVED',
        },
      });

      await tx.task.updateMany({
        where: {
          projectId: report.projectId,
          deletedAt: null,
        },
        data: {
          status: 'DELETED',
          deletedAt: resolvedAt,
        },
      });

      await createNotification({
        client: tx,
        userId: report.project.ownerUserId,
        actorUserId: userId,
        projectId: report.projectId,
        type: 'PROJECT_ARCHIVED_MODERATION',
        payload: {
          project_id: report.projectId,
          project_title: report.project.title,
          reason: report.reason,
          resolution_action: 'DELETE',
          resolution_note: note || '',
        },
      });
    }

    return tx.projectReport.update({
      where: { id: reportId },
      data: {
        status: 'RESOLVED',
        resolutionAction: action,
        resolutionNote: note || '',
        resolvedByUserId: userId,
        resolvedAt,
      },
      select: {
        id: true,
        status: true,
        resolutionAction: true,
        resolvedAt: true,
      },
    });
  });

  return {
    reportId: updatedReport.id,
    status: updatedReport.status,
    action: updatedReport.resolutionAction,
    resolvedAt: updatedReport.resolvedAt,
  };
}
