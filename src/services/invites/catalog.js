import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get invites for a task (company view)
 */
export async function getTaskInvites({ userId, taskId, page = 1, size = 20, status }) {
  // Verify task exists and user is owner
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      ownerUserId: true,
      deletedAt: true,
    },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  if (task.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
  }

  const skip = (page - 1) * size;
  const where = {
    taskId,
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.taskInvite.findMany({
      where,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        respondedAt: true,
        developer: {
          select: {
            id: true,
            developerProfile: {
              select: {
                displayName: true,
                jobTitle: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.taskInvite.count({ where }),
  ]);

  return {
    items: items.map((invite) => ({
      invite_id: invite.id,
      status: invite.status,
      message: invite.message,
      created_at: invite.createdAt.toISOString(),
      responded_at: invite.respondedAt ? invite.respondedAt.toISOString() : null,
      developer: {
        user_id: invite.developer.id,
        display_name: invite.developer.developerProfile?.displayName,
        primary_role: invite.developer.developerProfile?.jobTitle,
        avatar_url: invite.developer.developerProfile?.avatarUrl,
      },
    })),
    page,
    size,
    total,
  };
}

/**
 * Get invites for the current developer (inbox)
 */
export async function getMyInvites({ userId, page = 1, size = 20, status }) {
  // Verify developer profile exists
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const skip = (page - 1) * size;
  const where = {
    developerUserId: userId,
    ...(status && { status }),
  };

  const [items, total] = await Promise.all([
    prisma.taskInvite.findMany({
      where,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        respondedAt: true,
        task: {
          select: {
            id: true,
            title: true,
            category: true,
            difficulty: true,
            type: true,
          },
        },
        company: {
          select: {
            id: true,
            companyProfile: {
              select: {
                companyName: true,
                verified: true,
                avgRating: true,
                reviewsCount: true,
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.taskInvite.count({ where }),
  ]);

  return {
    items: items.map((invite) => {
      const companyProfile = invite.company.companyProfile;
      const avgRating = companyProfile?.avgRating;

      return {
        invite_id: invite.id,
        status: invite.status,
        message: invite.message,
        created_at: invite.createdAt.toISOString(),
        responded_at: invite.respondedAt ? invite.respondedAt.toISOString() : null,
        task: {
          task_id: invite.task.id,
          title: invite.task.title,
          category: invite.task.category,
          difficulty: invite.task.difficulty,
          type: invite.task.type,
        },
        company: {
          user_id: invite.company.id,
          company_name: companyProfile?.companyName,
          verified: companyProfile?.verified,
          avg_rating: avgRating === null || avgRating === undefined ? null : Number(avgRating),
          reviews_count: companyProfile?.reviewsCount,
        },
      };
    }),
    page,
    size,
    total,
  };
}
