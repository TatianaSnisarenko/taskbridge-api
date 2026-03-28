import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findTaskForReport } from '../../db/queries/tasks.queries.js';
import { invalidateCachedPublicTasksCatalog } from '../../cache/tasks-catalog.js';

export async function reportTask({ userId, persona, taskId, report }) {
  await findTaskForReport(taskId);

  try {
    const created = await prisma.taskReport.create({
      data: {
        taskId,
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
      throw new ApiError(409, 'ALREADY_REPORTED', 'You have already reported this task');
    }
    throw error;
  }
}

export async function getTaskReports({ page = 1, size = 20, status, reason }) {
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
    prisma.taskReport.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        task: {
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
    prisma.taskReport.count({ where }),
  ]);

  return {
    items: reports,
    page: Number(page),
    size: take,
    total,
  };
}

export async function resolveTaskReport({ userId, reportId, action, note }) {
  const report = await prisma.taskReport.findUnique({
    where: { id: reportId },
    include: {
      task: {
        select: {
          id: true,
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
    if (action === 'DELETE' && !report.task.deletedAt) {
      await tx.task.update({
        where: { id: report.taskId },
        data: {
          status: 'DELETED',
          deletedAt: resolvedAt,
        },
      });
    }

    return tx.taskReport.update({
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

  if (action === 'DELETE') {
    await invalidateCachedPublicTasksCatalog();
  }

  return {
    reportId: updatedReport.id,
    status: updatedReport.status,
    action: updatedReport.resolutionAction,
    resolvedAt: updatedReport.resolvedAt,
  };
}
