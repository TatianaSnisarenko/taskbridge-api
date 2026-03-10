import { prisma } from '../../../db/prisma.js';
import { ApiError } from '../../../utils/ApiError.js';
import { createNotification } from '../../notifications/index.js';

export async function openTaskDispute({ userId, taskId, reason }) {
  const updated = await prisma.$transaction(async (tx) => {
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

    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new ApiError(409, 'INVALID_STATE', 'Only IN_PROGRESS tasks can be moved to DISPUTE');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'DISPUTE',
      },
      select: {
        id: true,
        status: true,
      },
    });

    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'TASK_DISPUTE_OPENED',
      payload: {
        task_id: task.id,
        status: updatedTask.status,
        reason,
      },
    });

    return updatedTask;
  });

  return {
    taskId: updated.id,
    status: updated.status,
  };
}

export async function resolveTaskDispute({ userId, taskId, action, reason }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        projectId: true,
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'NOT_FOUND', 'Task not found');
    }

    if (task.status !== 'DISPUTE') {
      throw new ApiError(409, 'INVALID_STATE', 'Only DISPUTE tasks can be resolved by admin');
    }

    const updateData =
      action === 'MARK_FAILED'
        ? { status: 'FAILED', failedAt: new Date() }
        : { status: 'IN_PROGRESS' };

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        status: true,
        projectId: true,
      },
    });

    if (action === 'MARK_FAILED' && updated.projectId) {
      const project = await tx.project.findUnique({
        where: { id: updated.projectId },
        select: { id: true, maxTalents: true, status: true },
      });

      if (project && project.status === 'ACTIVE') {
        const completedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'COMPLETED',
            deletedAt: null,
          },
        });

        const failedCount = await tx.task.count({
          where: {
            projectId: updated.projectId,
            status: 'FAILED',
            deletedAt: null,
          },
        });

        if (completedCount + failedCount >= project.maxTalents) {
          await tx.project.update({
            where: { id: updated.projectId },
            data: { status: 'ARCHIVED' },
          });
        }
      }
    }

    return updated;
  });

  return {
    taskId: result.id,
    status: result.status,
    action,
    reason,
    resolvedBy: userId,
  };
}
