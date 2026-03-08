import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { findProjectForReport } from '../../db/queries/projects.queries.js';

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
