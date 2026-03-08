import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get notifications for the current user with pagination
 * @param {string} persona - Required persona filter ('developer' or 'company')
 */
export async function getMyNotifications({
  userId,
  page = 1,
  size = 20,
  unreadOnly = false,
  persona,
}) {
  const skip = (page - 1) * size;

  const whereFilter = { userId };

  if (unreadOnly) {
    whereFilter.readAt = null;
  }

  const [allItems, , unreadTotal] = await Promise.all([
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
        task: {
          select: {
            ownerUserId: true,
          },
        },
        actor: {
          select: {
            developerProfile: { select: { userId: true } },
            companyProfile: { select: { userId: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }),
    prisma.notification.count({
      where: whereFilter,
    }),
    prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    }),
  ]);

  const filteredItems = allItems.filter((notif) =>
    isNotificationRelevantForPersona(notif, userId, persona)
  );

  const paginatedItems = filteredItems.slice(skip, skip + size);
  const filteredTotal = filteredItems.length;

  return {
    items: paginatedItems.map((notif) => ({
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
    total: filteredTotal,
    unread_total: unreadTotal,
  };
}

/**
 * Mark a notification as read for the current user (persona-aware)
 */
export async function markNotificationAsRead({ userId, notificationId, persona }) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: {
      id: true,
      userId: true,
      type: true,
      readAt: true,
      createdAt: true,
      task: {
        select: {
          ownerUserId: true,
        },
      },
      actor: {
        select: {
          developerProfile: { select: { userId: true } },
          companyProfile: { select: { userId: true } },
        },
      },
    },
  });

  if (!notification || notification.userId !== userId) {
    throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

  const isRelevant = isNotificationRelevantForPersona(notification, userId, persona);
  if (!isRelevant) {
    throw new ApiError(404, 'NOT_FOUND', 'Notification not found');
  }

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
 * Mark all notifications as read for the current user (persona-aware)
 */
export async function markAllNotificationsAsRead({ userId, persona }) {
  const now = new Date();

  const unreadNotifications = await prisma.notification.findMany({
    where: {
      userId,
      readAt: null,
    },
    select: {
      id: true,
      type: true,
      task: {
        select: {
          ownerUserId: true,
        },
      },
      actor: {
        select: {
          developerProfile: { select: { userId: true } },
          companyProfile: { select: { userId: true } },
        },
      },
    },
  });

  const notificationsToMark = unreadNotifications.filter((notif) =>
    isNotificationRelevantForPersona(notif, userId, persona)
  );

  if (notificationsToMark.length > 0) {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationsToMark.map((n) => n.id) },
      },
      data: {
        readAt: now,
      },
    });
  }

  return {
    updated: true,
    read_at: now.toISOString(),
  };
}

/**
 * Helper function to check if a notification is relevant for a given persona
 */
function isNotificationRelevantForPersona(notif, userId, persona) {
  switch (notif.type) {
    case 'APPLICATION_CREATED':
      return persona === 'company' && notif.task?.ownerUserId === userId;
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
    case 'COMPLETION_REQUESTED':
      return persona === 'developer';
    case 'TASK_COMPLETED':
      return persona === 'company' && notif.task?.ownerUserId === userId;
    case 'TASK_INVITE_CREATED':
      return persona === 'developer';
    case 'TASK_INVITE_ACCEPTED':
    case 'TASK_INVITE_DECLINED':
      return persona === 'company' && notif.task?.ownerUserId === userId;
    case 'TASK_INVITE_CANCELLED':
      return persona === 'developer';
    case 'REVIEW_CREATED':
      if (notif.actor?.developerProfile?.userId === userId) {
        return persona === 'company' && notif.task?.ownerUserId === userId;
      }
      if (notif.task?.ownerUserId === userId) {
        return persona === 'developer';
      }
      return false;
    case 'CHAT_MESSAGE':
      return true;
    default:
      return true;
  }
}
