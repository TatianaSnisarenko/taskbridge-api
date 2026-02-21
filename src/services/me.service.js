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

/**
 * Get notifications for the current user with pagination
 */
export async function getMyNotifications({ userId, page = 1, size = 20, unreadOnly = false }) {
  const skip = (page - 1) * size;

  // Build filter for notifications
  const whereFilter = { userId };

  // Apply unread_only filter if requested
  if (unreadOnly) {
    whereFilter.readAt = null;
  }

  // Fetch notifications and total count in parallel
  const [items, total, unreadTotal] = await Promise.all([
    prisma.notification.findMany({
      where: whereFilter,
      select: {
        id: true,
        type: true,
        actorUserId: true,
        projectId: true,
        taskId: true,
        threadId: true,
        payload: true,
        createdAt: true,
        readAt: true,
      },
      skip,
      take: size,
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.notification.count({
      where: whereFilter,
    }),
    // Count unread notifications (always for current user, regardless of filter)
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  ]);

  return {
    items: items.map((notif) => ({
      id: notif.id,
      type: notif.type,
      actor_user_id: notif.actorUserId,
      project_id: notif.projectId,
      task_id: notif.taskId,
      thread_id: notif.threadId,
      payload: notif.payload,
      created_at: notif.createdAt.toISOString(),
      read_at: notif.readAt?.toISOString() || null,
    })),
    page,
    size,
    total,
    unread_total: unreadTotal,
  };
}

/**
 * Mark a notification as read for the current user
 */
export async function markNotificationAsRead({ userId, notificationId }) {
  // Find the notification and verify it belongs to the current user
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      userId: true,
      readAt: true,
      createdAt: true,
    },
  });

  // Check if notification exists and belongs to current user
  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

  // Update notification with read timestamp
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
    select: {
      id: true,
      readAt: true,
    },
  });

  return {
    id: updated.id,
    read_at: updated.readAt.toISOString(),
  };
}

/**
 * Mark all notifications as read for the current user
 */
export async function markAllNotificationsAsRead({ userId }) {
  const now = new Date();

  // Update all unread notifications for the user
  await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: now,
    },
  });

  return {
    updated: true,
    read_at: now.toISOString(),
  };
}
