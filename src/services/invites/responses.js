import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { createNotification, buildTaskNotificationPayload } from '../notifications/index.js';
import { getOrCreateChatThread } from '../chat/index.js';
import { sendImportantNotificationEmail } from '../notification-email/index.js';
import { invalidateCachedCandidateCount } from '../../cache/candidates.js';
import { invalidateCachedPublicTasksCatalog } from '../../cache/tasks-catalog.js';
import {
  invalidateCachedTaskInvites,
  invalidateCachedMyInvites,
} from '../../cache/invites-catalog.js';

/**
 * Accept an invite (developer action)
 */
export async function acceptInvite({ userId, inviteId }) {
  const { startTaskWithDeveloper } = await import('../tasks/index.js');

  const result = await prisma.$transaction(async (tx) => {
    // Fetch invite with task info
    const invite = await tx.taskInvite.findUnique({
      where: { id: inviteId },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            ownerUserId: true,
            acceptedApplicationId: true,
          },
        },
      },
    });

    if (!invite) {
      throw new ApiError(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    // Verify user is the invited developer
    if (invite.developerUserId !== userId) {
      throw new ApiError(403, 'NOT_INVITE_RECIPIENT', 'User is not the invite recipient');
    }

    // Verify invite is PENDING
    if (invite.status !== 'PENDING') {
      throw new ApiError(409, 'INVALID_STATE', 'Invite is not in PENDING status');
    }

    // Use shared helper to start task with developer
    const taskResult = await startTaskWithDeveloper({
      tx,
      taskId: invite.task.id,
      developerUserId: userId,
      companyUserId: invite.companyUserId,
      source: 'invite',
      inviteId,
    });

    // Update invite to ACCEPTED
    await tx.taskInvite.update({
      where: { id: inviteId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    // Cancel other pending invites for this task
    await tx.taskInvite.updateMany({
      where: {
        taskId: invite.task.id,
        id: { not: inviteId },
        status: 'PENDING',
      },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    // Create notification for company
    await createNotification({
      client: tx,
      userId: invite.companyUserId,
      actorUserId: userId,
      taskId: invite.task.id,
      type: 'TASK_INVITE_ACCEPTED',
      payload: buildTaskNotificationPayload({
        taskId: invite.task.id,
        inviteId,
      }),
    });

    return {
      ...taskResult,
      invite_id: inviteId,
      task_status: taskResult.task_status,
    };
  });

  // Invalidate candidate count cache for this task
  // Invite accepted means developer is no longer available
  await invalidateCachedCandidateCount(result.task_id);
  await invalidateCachedPublicTasksCatalog();
  await invalidateCachedTaskInvites(result.task_id);
  await invalidateCachedMyInvites(result.accepted_developer_user_id);

  // Create chat thread after transaction
  const thread = await getOrCreateChatThread({
    taskId: result.task_id,
    companyUserId: result.company_user_id,
    developerUserId: result.accepted_developer_user_id,
  });

  // Send email notification to company
  const companyUser = await prisma.user.findUnique({
    where: { id: result.company_user_id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      companyProfile: {
        select: { companyName: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: result.task_id },
    select: { id: true, title: true },
  });

  if (companyUser && task) {
    await sendImportantNotificationEmail({
      type: 'TASK_INVITE_ACCEPTED',
      recipient: {
        email: companyUser.email,
        name: companyUser.companyProfile?.companyName || 'Company',
        email_verified: companyUser.emailVerified,
      },
      task: {
        id: task.id,
        title: task.title,
      },
    });
  }

  return {
    invite_id: result.invite_id,
    task_id: result.task_id,
    task_status: result.task_status,
    application_id: result.accepted_application_id,
    accepted_developer_user_id: result.accepted_developer_user_id,
    thread_id: thread?.id ?? null,
  };
}

/**
 * Decline an invite (developer action)
 */
export async function declineInvite({ userId, inviteId }) {
  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.taskInvite.findUnique({
      where: { id: inviteId },
      select: {
        id: true,
        taskId: true,
        companyUserId: true,
        developerUserId: true,
        status: true,
      },
    });

    if (!invite) {
      throw new ApiError(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    if (invite.developerUserId !== userId) {
      throw new ApiError(403, 'NOT_INVITE_RECIPIENT', 'User is not the invite recipient');
    }

    if (invite.status !== 'PENDING') {
      throw new ApiError(409, 'INVALID_STATE', 'Invite already processed');
    }

    const updatedInvite = await tx.taskInvite.update({
      where: { id: inviteId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        respondedAt: true,
      },
    });

    // Create notification for company
    await createNotification({
      client: tx,
      userId: invite.companyUserId,
      actorUserId: userId,
      taskId: invite.taskId,
      type: 'TASK_INVITE_DECLINED',
      payload: buildTaskNotificationPayload({
        taskId: invite.taskId,
        inviteId,
      }),
    });

    return {
      invite_id: updatedInvite.id,
      status: updatedInvite.status,
      responded_at: updatedInvite.respondedAt.toISOString(),
      company_user_id: invite.companyUserId,
      task_id: invite.taskId,
    };
  });

  // Invalidate candidate count cache for this task
  // Declined invite doesn't change available candidates (developer still available)
  // However, invalidate to ensure consistency
  await invalidateCachedCandidateCount(result.task_id);
  await invalidateCachedTaskInvites(result.task_id);
  await invalidateCachedMyInvites(userId);

  // Send email notification to company after transaction
  const companyUser = await prisma.user.findUnique({
    where: { id: result.company_user_id },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      companyProfile: {
        select: { companyName: true },
      },
    },
  });

  const task = await prisma.task.findUnique({
    where: { id: result.task_id },
    select: { id: true, title: true },
  });

  if (companyUser && task) {
    await sendImportantNotificationEmail({
      type: 'TASK_INVITE_DECLINED',
      recipient: {
        email: companyUser.email,
        name: companyUser.companyProfile?.companyName || 'Company',
        email_verified: companyUser.emailVerified,
      },
      task: {
        id: task.id,
        title: task.title,
      },
    });
  }

  return {
    invite_id: result.invite_id,
    status: result.status,
    responded_at: result.responded_at,
  };
}

/**
 * Cancel an invite (company action)
 */
export async function cancelInvite({ userId, inviteId }) {
  const result = await prisma.$transaction(async (tx) => {
    const invite = await tx.taskInvite.findUnique({
      where: { id: inviteId },
      include: {
        task: {
          select: {
            id: true,
            ownerUserId: true,
          },
        },
      },
    });

    if (!invite) {
      throw new ApiError(404, 'INVITE_NOT_FOUND', 'Invite not found');
    }

    // Verify user is task owner (company)
    if (invite.task.ownerUserId !== userId) {
      throw new ApiError(403, 'NOT_OWNER', 'User is not the task owner');
    }

    if (invite.status !== 'PENDING') {
      throw new ApiError(409, 'INVALID_STATE', 'Invite is not in PENDING status');
    }

    const updatedInvite = await tx.taskInvite.update({
      where: { id: inviteId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        cancelledAt: true,
      },
    });

    // Create notification for developer
    await createNotification({
      client: tx,
      userId: invite.developerUserId,
      actorUserId: userId,
      taskId: invite.taskId,
      type: 'TASK_INVITE_CANCELLED',
      payload: buildTaskNotificationPayload({
        taskId: invite.taskId,
        inviteId,
      }),
    });

    return {
      invite_id: updatedInvite.id,
      status: updatedInvite.status,
      cancelled_at: updatedInvite.cancelledAt.toISOString(),
      developer_user_id: invite.developerUserId,
      task_id: invite.taskId,
    };
  });

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
      type: 'TASK_INVITE_CANCELLED',
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

  return {
    invite_id: result.invite_id,
    status: result.status,
    cancelled_at: result.cancelled_at,
  };
}
