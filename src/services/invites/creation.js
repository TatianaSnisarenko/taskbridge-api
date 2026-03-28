import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { createNotification, buildTaskNotificationPayload } from '../notifications/index.js';
import { sendImportantNotificationEmail } from '../notification-email/index.js';
import { invalidateCachedCandidateCount } from '../../cache/candidates.js';
import {
  invalidateCachedTaskInvites,
  invalidateCachedMyInvites,
} from '../../cache/invites-catalog.js';

/**
 * Create a task invite for a developer
 */
export async function createTaskInvite({ userId, taskId, developerId, message }) {
  const result = await prisma.$transaction(async (tx) => {
    // Fetch task with owner and status
    const task = await tx.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        status: true,
        ownerUserId: true,
        acceptedApplicationId: true,
        deletedAt: true,
      },
    });

    if (!task || task.deletedAt) {
      throw new ApiError(404, 'TASK_NOT_FOUND', 'Task not found');
    }

    // Verify user is task owner
    if (task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    // Verify task is PUBLISHED
    if (task.status !== 'PUBLISHED') {
      throw new ApiError(409, 'TASK_NOT_PUBLISHED', 'Task is not in PUBLISHED status');
    }

    // Verify task doesn't have accepted application
    if (task.acceptedApplicationId) {
      throw new ApiError(409, 'TASK_ALREADY_MATCHED', 'Task already has an accepted developer');
    }

    // Verify developer exists and has profile
    const developer = await tx.user.findUnique({
      where: { id: developerId },
      select: {
        id: true,
        developerProfile: {
          select: { userId: true },
        },
      },
    });

    if (!developer || !developer.developerProfile) {
      throw new ApiError(404, 'DEVELOPER_NOT_FOUND', 'Developer not found or has no profile');
    }

    // Check if developer is already accepted for this task
    const existingAcceptedApplication = await tx.application.findFirst({
      where: {
        taskId,
        developerUserId: developerId,
        status: 'ACCEPTED',
      },
      select: { id: true },
    });

    if (existingAcceptedApplication) {
      throw new ApiError(
        409,
        'DEVELOPER_ALREADY_ACCEPTED',
        'Developer is already accepted for this task'
      );
    }

    // Check for existing active invite
    const existingInvite = await tx.taskInvite.findUnique({
      where: {
        taskId_developerUserId: {
          taskId,
          developerUserId: developerId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      throw new ApiError(
        409,
        'INVITE_ALREADY_EXISTS',
        'An active invite already exists for this developer'
      );
    }

    // Check if developer already applied
    const existingApplication = await tx.application.findUnique({
      where: {
        taskId_developerUserId: {
          taskId,
          developerUserId: developerId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingApplication && existingApplication.status === 'APPLIED') {
      throw new ApiError(409, 'INVITE_NOT_ALLOWED', 'Developer already applied to this task');
    }

    // Create invite
    const invite = await tx.taskInvite.create({
      data: {
        taskId,
        companyUserId: userId,
        developerUserId: developerId,
        status: 'PENDING',
        message: message || null,
      },
      select: {
        id: true,
        taskId: true,
        developerUserId: true,
        status: true,
        createdAt: true,
      },
    });

    // Create notification for developer
    await createNotification({
      client: tx,
      userId: developerId,
      actorUserId: userId,
      taskId,
      type: 'TASK_INVITE_CREATED',
      payload: buildTaskNotificationPayload({
        taskId,
        inviteId: invite.id,
      }),
    });

    return {
      invite_id: invite.id,
      task_id: invite.taskId,
      developer_user_id: invite.developerUserId,
      status: invite.status,
      created_at: invite.createdAt.toISOString(),
    };
  });

  // Invalidate candidate count cache for this task
  // New invite means invited developer is no longer available
  await invalidateCachedCandidateCount(result.task_id);
  await invalidateCachedTaskInvites(result.task_id);
  await invalidateCachedMyInvites(result.developer_user_id);

  // Send email notification to developer after transaction
  const developerUser = await prisma.user.findUnique({
    where: { id: result.developer_user_id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      developerProfile: {
        select: { displayName: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: result.task_id },
    select: { id: true, title: true },
  });

  if (developerUser && task) {
    await sendImportantNotificationEmail({
      type: 'TASK_INVITE_CREATED',
      recipient: {
        email: developerUser.email,
        name: developerUser.developerProfile?.displayName || 'Developer',
        email_verified: developerUser.emailVerified,
      },
      task: {
        id: task.id,
        title: task.title,
      },
    });
  }

  return result;
}
