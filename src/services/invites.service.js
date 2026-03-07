import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification, buildTaskNotificationPayload } from './notifications.service.js';
import { getOrCreateChatThread } from './chat.service.js';
import { sendImportantNotificationEmail } from './notification-email.service.js';

/**
 * Create a task invite for a developer
 */
export async function createTaskInvite({ userId, taskId, developerId, message }) {
  return await prisma.$transaction(async (tx) => {
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
}

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

/**
 * Accept an invite (developer action)
 */
export async function acceptInvite({ userId, inviteId }) {
  // Import shared helper from tasks.service - will be available after we export it
  const { startTaskWithDeveloper } = await import('./tasks.service.js');

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
  return await prisma.$transaction(async (tx) => {
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
    };
  });
}

/**
 * Cancel an invite (company action)
 */
export async function cancelInvite({ userId, inviteId }) {
  return await prisma.$transaction(async (tx) => {
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
    };
  });
}
