import { prisma } from '../../../db/prisma.js';
import { ApiError } from '../../../utils/ApiError.js';
import { createNotification } from '../../notifications/index.js';

export async function createReview({ userId, taskId, review }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found');
    }

    if (task.status !== 'COMPLETED' && task.status !== 'FAILED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not completed or failed');
    }

    const isOwner = task.ownerUserId === userId;
    const isDeveloper = task.acceptedApplication?.developerUserId === userId;

    if (!isOwner && !isDeveloper) {
      throw new ApiError(403, 'FORBIDDEN', 'User is not a participant in this task');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const targetUserId = isOwner ? task.acceptedApplication.developerUserId : task.ownerUserId;

    const existingReview = await tx.review.findUnique({
      where: {
        taskId_authorUserId: {
          taskId: task.id,
          authorUserId: userId,
        },
      },
    });

    if (existingReview) {
      throw new ApiError(409, 'ALREADY_REVIEWED', 'User has already reviewed this task');
    }

    const created = await tx.review.create({
      data: {
        taskId: task.id,
        authorUserId: userId,
        targetUserId,
        rating: review.rating,
        text: review.text || null,
      },
      select: {
        id: true,
        taskId: true,
        authorUserId: true,
        targetUserId: true,
        rating: true,
        text: true,
        createdAt: true,
      },
    });

    await createNotification({
      client: tx,
      userId: targetUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'REVIEW_CREATED',
      payload: {
        review_id: created.id,
        task_id: created.taskId,
        rating: created.rating,
      },
    });

    return {
      reviewId: created.id,
      taskId: created.taskId,
      authorUserId: created.authorUserId,
      targetUserId: created.targetUserId,
      rating: created.rating,
      text: created.text,
      createdAt: created.createdAt,
    };
  });

  return result;
}
