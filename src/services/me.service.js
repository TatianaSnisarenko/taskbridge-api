import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Get applications created by the current developer user with pagination
 */
export async function getMyApplications({ userId, page = 1, size = 20 }) {
  // Verify developer profile exists
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const skip = (page - 1) * size;

  // Fetch applications with task and company info
  const [items, total] = await Promise.all([
    prisma.application.findMany({
      where: {
        developerUserId: userId,
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            owner: {
              select: {
                id: true,
                companyProfile: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.application.count({
      where: {
        developerUserId: userId,
      },
    }),
  ]);

  return {
    items: items.map((app) => ({
      application_id: app.id,
      status: app.status,
      created_at: app.createdAt.toISOString(),
      task: {
        task_id: app.task.id,
        title: app.task.title,
        status: app.task.status,
        project: app.task.project
          ? {
              project_id: app.task.project.id,
              title: app.task.project.title,
            }
          : null,
      },
      company: {
        user_id: app.task.owner.id,
        company_name: app.task.owner.companyProfile?.companyName,
      },
    })),
    page,
    size,
    total,
  };
}
