import { prisma } from '../../db/prisma.js';
import { isNotificationRelevantForPersona } from './notifications-helpers.js';

const CHAT_NOTIFICATION_TYPES = new Set(['CHAT_MESSAGE']);
const REVIEW_NOTIFICATION_TYPES = new Set(['REVIEW_CREATED']);

function mapNotificationCategory(type) {
  if (CHAT_NOTIFICATION_TYPES.has(type)) return 'chat';
  if (REVIEW_NOTIFICATION_TYPES.has(type)) return 'reviews';
  return 'projects';
}

function mapNotificationTarget({ threadId, taskId, projectId }) {
  if (threadId) {
    return {
      type: 'thread',
      id: threadId,
      url: `/chat/threads/${threadId}`,
    };
  }

  if (taskId) {
    return {
      type: 'task',
      id: taskId,
      url: `/tasks/${taskId}`,
    };
  }

  if (projectId) {
    return {
      type: 'project',
      id: projectId,
      url: `/projects/${projectId}`,
    };
  }

  return null;
}

function buildNotificationMessage({ type, payload, taskTitle, projectTitle }) {
  if (payload?.message && typeof payload.message === 'string') {
    return payload.message;
  }

  const taskContext = taskTitle ? `: ${taskTitle}` : '';
  const projectContext = projectTitle ? `: ${projectTitle}` : '';

  switch (type) {
    case 'APPLICATION_CREATED':
      return `New application received${taskContext}`;
    case 'APPLICATION_ACCEPTED':
      return `Your application was accepted${taskContext}`;
    case 'APPLICATION_REJECTED':
      return `Your application was rejected${taskContext}`;
    case 'COMPLETION_REQUESTED':
      return `Task completion update${taskContext}`;
    case 'TASK_DISPUTE_OPENED':
      return `Task dispute opened${taskContext}`;
    case 'TASK_COMPLETED':
      return `Task status updated${taskContext}`;
    case 'REVIEW_CREATED':
      return 'New review received';
    case 'CHAT_MESSAGE':
      return `New chat message${taskContext}`;
    case 'TASK_INVITE_CREATED':
      return `New task invite${taskContext}`;
    case 'TASK_INVITE_ACCEPTED':
      return `Task invite accepted${taskContext}`;
    case 'TASK_INVITE_DECLINED':
      return `Task invite declined${taskContext}`;
    case 'TASK_INVITE_CANCELLED':
      return `Task invite cancelled${taskContext}`;
    case 'PROJECT_ARCHIVED_LIMIT_REACHED':
      return `Project archived after reaching max talents${projectContext}`;
    case 'PROJECT_ARCHIVED_MODERATION':
      return `Project archived by moderation${projectContext}`;
    default:
      return `Notification${projectContext || taskContext}`;
  }
}

/**
 * Get notifications for the current user with pagination
 * @param {string} persona - Required persona filter ('developer' or 'company')
 */
export async function getMyNotifications({
  userId,
  page = 1,
  size = 20,
  unreadOnly = false,
  importantOnly = false,
  persona,
}) {
  const skip = (page - 1) * size;

  const whereFilter = { userId };

  if (unreadOnly) {
    whereFilter.readAt = null;
  }

  if (importantOnly) {
    whereFilter.importantAt = { not: null };
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
        importantAt: true,
        task: {
          select: {
            ownerUserId: true,
            title: true,
          },
        },
        project: {
          select: {
            title: true,
          },
        },
        actor: {
          select: {
            developerProfile: {
              select: {
                userId: true,
                displayName: true,
              },
            },
            companyProfile: {
              select: {
                userId: true,
                companyName: true,
              },
            },
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
    items: paginatedItems.map((notif) => {
      const actorName =
        notif.actor?.developerProfile?.displayName ||
        notif.actor?.companyProfile?.companyName ||
        null;
      const companyName = notif.actor?.companyProfile?.companyName || null;
      const projectTitle = notif.project?.title || null;
      const taskTitle = notif.task?.title || null;
      const category = mapNotificationCategory(notif.type);
      const target = mapNotificationTarget({
        threadId: notif.threadId,
        taskId: notif.taskId,
        projectId: notif.projectId,
      });

      return {
        id: notif.id,
        type: notif.type,
        actor_user_id: notif.actorUserId,
        actor_name: actorName,
        company_name: companyName,
        project_id: notif.projectId,
        project_title: projectTitle,
        task_id: notif.taskId,
        task_title: taskTitle,
        thread_id: notif.threadId,
        message: buildNotificationMessage({
          type: notif.type,
          payload: notif.payload,
          taskTitle,
          projectTitle,
        }),
        category,
        target,
        payload: notif.payload,
        created_at: notif.createdAt.toISOString(),
        read_at: notif.readAt?.toISOString() || null,
        important_at: notif.importantAt?.toISOString() || null,
      };
    }),
    page,
    size,
    total: filteredTotal,
    unread_total: unreadTotal,
  };
}

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
