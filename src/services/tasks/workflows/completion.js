import { prisma } from '../../../db/prisma.js';
import { ApiError } from '../../../utils/ApiError.js';
import { env } from '../../../config/env.js';
import { createNotification } from '../../notifications/index.js';
import { sendImportantNotificationEmail } from '../../notification-email/index.js';

export async function requestTaskCompletion({ userId, taskId }) {
  const result = await prisma.$transaction(async (tx) => {
    const requestedAt = new Date();
    const responseDeadlineAt = new Date(
      requestedAt.getTime() + env.taskCompletionResponseHours * 60 * 60 * 1000
    );

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

    if (task.status !== 'IN_PROGRESS' && task.status !== 'DISPUTE') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not in IN_PROGRESS or DISPUTE status');
    }

    if (!task.acceptedApplicationId || task.acceptedApplication?.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'Only accepted developer can request completion');
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETION_REQUESTED',
        completionRequestedAt: requestedAt,
        completionRequestExpiresAt: responseDeadlineAt,
      },
      select: {
        id: true,
        title: true,
        status: true,
        completionRequestExpiresAt: true,
      },
    });

    await createNotification({
      client: tx,
      userId: task.ownerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'COMPLETION_REQUESTED',
      payload: {
        task_id: task.id,
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      responseDeadlineAt: updated.completionRequestExpiresAt,
      companyUserId: task.ownerUserId,
    };
  });

  const companyUser = await prisma.user.findUnique({
    where: { id: result.companyUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      companyProfile: {
        select: { companyName: true },
      },
    },
  });

  if (companyUser) {
    await sendImportantNotificationEmail({
      type: 'COMPLETION_REQUESTED',
      recipient: {
        email: companyUser.email,
        name: companyUser.companyProfile?.companyName || 'Company',
        email_verified: companyUser.emailVerified,
      },
      task: {
        id: result.taskId,
        title: result.taskTitle,
      },
    });
  }

  return {
    taskId: result.taskId,
    status: result.status,
    responseDeadlineAt: result.responseDeadlineAt,
  };
}

export async function rejectTaskCompletion({ userId, taskId, feedback }) {
  const result = await prisma.$transaction(async (tx) => {
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        title: true,
        ownerUserId: true,
        status: true,
        deletedAt: true,
        rejectionCount: true,
        acceptedApplicationId: true,
        acceptedApplication: {
          select: {
            developerUserId: true,
          },
        },
        chatThread: {
          select: {
            id: true,
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

    if (task.status !== 'COMPLETION_REQUESTED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not awaiting completion confirmation');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const openDispute = await tx.taskDispute.findFirst({
      where: {
        taskId: task.id,
        status: 'OPEN',
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    const newRejectionCount = task.rejectionCount + 1;
    const maxRejections = 3;
    const isFinalRejection = newRejectionCount >= maxRejections;

    const updateData = {
      rejectionCount: newRejectionCount,
      completionRequestedAt: null,
      completionRequestExpiresAt: null,
    };

    if (isFinalRejection) {
      updateData.status = 'FAILED';
      updateData.failedAt = new Date();
    } else {
      updateData.status = 'IN_PROGRESS';
    }

    const updated = await tx.task.update({
      where: { id: taskId },
      data: updateData,
      select: {
        id: true,
        title: true,
        status: true,
        rejectionCount: true,
        failedAt: true,
        projectId: true,
      },
    });

    // Record rejection reason in TaskCompletionRejection
    await tx.taskCompletionRejection.create({
      data: {
        taskId: taskId,
        rejectionNumber: newRejectionCount,
        feedback: feedback || null,
        rejectedByUserId: userId,
      },
    });

    if (openDispute) {
      await tx.taskDispute.update({
        where: { id: openDispute.id },
        data: {
          status: 'RESOLVED',
          resolutionAction: isFinalRejection ? 'MARK_FAILED' : 'RETURN_TO_PROGRESS',
          resolutionReason:
            feedback ||
            (isFinalRejection
              ? 'Company rejected completion and task reached final failed state.'
              : 'Company rejected completion and returned task to active progress.'),
          resolvedByUserId: userId,
          resolvedAt: new Date(),
        },
      });
    }

    if (task.chatThread?.id) {
      const messageText = isFinalRejection
        ? `❌ **Completion Rejected (Final)**: After ${maxRejections} attempts, this task has been marked as FAILED.\n\n${feedback || 'No additional feedback provided.'}`
        : `⚠️ **Completion Rejected (Attempt ${newRejectionCount}/${maxRejections})**: Please review the feedback and resubmit.\n\n${feedback || 'No additional feedback provided.'}`;

      await tx.chatMessage.create({
        data: {
          thread: {
            connect: { id: task.chatThread.id },
          },
          sender: {
            connect: { id: userId },
          },
          text: messageText,
          sentAt: new Date(),
        },
      });

      await tx.chatThread.update({
        where: { id: task.chatThread.id },
        data: { lastMessageAt: new Date() },
      });
    }

    const notificationType = isFinalRejection ? 'TASK_COMPLETED' : 'COMPLETION_REQUESTED';
    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: notificationType,
      payload: {
        task_id: task.id,
        status: updated.status,
        rejection_count: updated.rejectionCount,
        is_final: isFinalRejection,
        ...(isFinalRejection && { failed_at: updated.failedAt.toISOString() }),
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      rejectionCount: updated.rejectionCount,
      isFinalRejection,
      failedAt: updated.failedAt,
      developerUserId: task.acceptedApplication.developerUserId,
    };
  });

  return {
    taskId: result.taskId,
    status: result.status,
    rejectionCount: result.rejectionCount,
    isFinalRejection: result.isFinalRejection,
  };
}

export async function confirmTaskCompletion({ userId, taskId }) {
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

    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
    }

    if (task.status !== 'COMPLETION_REQUESTED') {
      throw new ApiError(409, 'INVALID_STATE', 'Task is not awaiting completion confirmation');
    }

    if (!task.acceptedApplicationId || !task.acceptedApplication?.developerUserId) {
      throw new ApiError(409, 'INVALID_STATE', 'Accepted developer not found');
    }

    const openDispute = await tx.taskDispute.findFirst({
      where: {
        taskId: task.id,
        status: 'OPEN',
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    const completedAt = new Date();

    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt,
        completionRequestedAt: null,
        completionRequestExpiresAt: null,
      },
      select: { id: true, title: true, status: true, completedAt: true, projectId: true },
    });

    if (openDispute) {
      await tx.taskDispute.update({
        where: { id: openDispute.id },
        data: {
          status: 'RESOLVED',
          resolutionAction: 'MARK_COMPLETED',
          resolutionReason: 'Completion confirmed by company owner.',
          resolvedByUserId: userId,
          resolvedAt: completedAt,
        },
      });
    }

    await createNotification({
      client: tx,
      userId: task.acceptedApplication.developerUserId,
      actorUserId: userId,
      taskId: task.id,
      type: 'TASK_COMPLETED',
      payload: {
        task_id: task.id,
        completed_at: updated.completedAt.toISOString(),
      },
    });

    return {
      taskId: updated.id,
      taskTitle: updated.title,
      status: updated.status,
      completedAt: updated.completedAt,
      developerUserId: task.acceptedApplication.developerUserId,
    };
  });

  const developerUser = await prisma.user.findUnique({
    where: { id: result.developerUserId },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      developerProfile: {
        select: { displayName: true },
      },
    },
  });

  if (developerUser) {
    await sendImportantNotificationEmail({
      type: 'TASK_COMPLETED',
      recipient: {
        email: developerUser.email,
        name: developerUser.developerProfile?.displayName || 'Developer',
        email_verified: developerUser.emailVerified,
      },
      task: {
        id: result.taskId,
        title: result.taskTitle,
      },
    });
  }

  return {
    taskId: result.taskId,
    status: result.status,
    completedAt: result.completedAt,
  };
}
