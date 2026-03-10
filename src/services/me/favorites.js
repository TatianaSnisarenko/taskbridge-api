import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Add a task to the current developer's favorites.
 * Requires a developer profile; the task must exist and be published/visible.
 * Returns 409 if already favorited.
 */
export async function addFavoriteTask({ userId, taskId }) {
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, deletedAt: true },
  });

  if (!task || task.deletedAt !== null) {
    throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
  }

  const existing = await prisma.taskFavorite.findUnique({
    where: { userId_taskId: { userId, taskId } },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(409, 'ALREADY_FAVORITED', 'Task is already in favorites');
  }

  const favorite = await prisma.taskFavorite.create({
    data: { userId, taskId },
    select: { id: true, taskId: true, createdAt: true },
  });

  return {
    favorite_id: favorite.id,
    task_id: favorite.taskId,
    saved_at: favorite.createdAt.toISOString(),
  };
}

/**
 * Remove a task from the current developer's favorites.
 * Returns 404 if the task is not in favorites.
 */
export async function removeFavoriteTask({ userId, taskId }) {
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const existing = await prisma.taskFavorite.findUnique({
    where: { userId_taskId: { userId, taskId } },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(404, 'FAVORITE_NOT_FOUND', 'Task is not in favorites');
  }

  await prisma.taskFavorite.delete({
    where: { userId_taskId: { userId, taskId } },
  });

  return { task_id: taskId, removed: true };
}

/**
 * Get paginated list of the current developer's favorited tasks.
 */
export async function getMyFavoriteTasks({ userId, page = 1, size = 20 }) {
  const developerProfile = await prisma.developerProfile.findUnique({
    where: { userId },
    select: { userId: true },
  });

  if (!developerProfile) {
    throw new ApiError(403, 'PERSONA_NOT_AVAILABLE', 'Developer profile does not exist');
  }

  const skip = (page - 1) * size;

  const [items, total] = await Promise.all([
    prisma.taskFavorite.findMany({
      where: { userId },
      select: {
        id: true,
        createdAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            category: true,
            difficulty: true,
            type: true,
            deletedAt: true,
            ownerUserId: true,
            owner: {
              select: {
                companyProfile: {
                  select: {
                    companyName: true,
                    verified: true,
                  },
                },
              },
            },
          },
        },
      },
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.taskFavorite.count({ where: { userId } }),
  ]);

  return {
    items: items.map((fav) => ({
      favorite_id: fav.id,
      saved_at: fav.createdAt.toISOString(),
      task: {
        task_id: fav.task.id,
        title: fav.task.title,
        status: fav.task.status,
        category: fav.task.category,
        difficulty: fav.task.difficulty,
        type: fav.task.type,
        is_deleted: fav.task.deletedAt !== null,
        company: {
          user_id: fav.task.ownerUserId,
          company_name: fav.task.owner.companyProfile?.companyName ?? null,
          verified: fav.task.owner.companyProfile?.verified ?? false,
        },
      },
    })),
    page,
    size,
    total,
  };
}
