import { prisma } from '../../db/prisma.js';
import { isNotificationRelevantForPersona } from './notifications-helpers.js';
import {
  getCachedUnreadNotificationCount,
  setCachedUnreadNotificationCount,
  invalidateCachedUnreadNotificationCount,
} from '../../cache/notifications.js';

const CHAT_NOTIFICATION_TYPES = new Set(['CHAT_MESSAGE']);
const REVIEW_NOTIFICATION_TYPES = new Set(['REVIEW_CREATED']);
const KNOWN_NOTIFICATION_TYPES = [
  'APPLICATION_CREATED',
  'APPLICATION_ACCEPTED',
  'APPLICATION_REJECTED',
  'COMPLETION_REQUESTED',
  'TASK_DISPUTE_OPENED',
  'TASK_COMPLETED',
  'TASK_DELETED',
  'REVIEW_CREATED',
  'CHAT_MESSAGE',
  'TASK_INVITE_CREATED',
  'TASK_INVITE_ACCEPTED',
  'TASK_INVITE_DECLINED',
  'TASK_INVITE_CANCELLED',
  'PROJECT_DELETED',
  'PROJECT_ARCHIVED_LIMIT_REACHED',
  'PROJECT_ARCHIVED_MODERATION',
  'MODERATOR_ROLE_GRANTED',
  'MODERATOR_ROLE_REVOKED',
];

const COMMON_VISIBLE_TYPES = [
  'CHAT_MESSAGE',
  'PROJECT_ARCHIVED_LIMIT_REACHED',
  'PROJECT_ARCHIVED_MODERATION',
  'MODERATOR_ROLE_GRANTED',
  'MODERATOR_ROLE_REVOKED',
];

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
    case 'TASK_DELETED':
      return `Task was deleted${taskContext}`;
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
    case 'PROJECT_DELETED':
      return `Project was deleted${projectContext}`;
    case 'PROJECT_ARCHIVED_LIMIT_REACHED':
      return `Project archived after reaching max talents${projectContext}`;
    case 'PROJECT_ARCHIVED_MODERATION':
      return `Project archived by moderation${projectContext}`;
    case 'MODERATOR_ROLE_GRANTED':
      return 'Your moderator role was granted';
    case 'MODERATOR_ROLE_REVOKED':
      return 'Your moderator role was revoked';
    default:
      return `Notification${projectContext || taskContext}`;
  }
}

function resolveActorRole({ notif, userId }) {
  if (!notif.actorUserId) return null;

  switch (notif.type) {
    case 'APPLICATION_CREATED':
      return 'developer';
    case 'APPLICATION_ACCEPTED':
    case 'APPLICATION_REJECTED':
    case 'TASK_COMPLETED':
    case 'TASK_DELETED':
    case 'PROJECT_DELETED':
    case 'TASK_INVITE_CREATED':
    case 'TASK_INVITE_CANCELLED':
      return 'company';
    case 'TASK_INVITE_ACCEPTED':
    case 'TASK_INVITE_DECLINED':
      return 'developer';
    case 'COMPLETION_REQUESTED':
      return notif.task?.ownerUserId === userId ? 'developer' : 'company';
    case 'TASK_DISPUTE_OPENED':
      return notif.task?.ownerUserId === notif.actorUserId ? 'company' : 'developer';
    case 'REVIEW_CREATED':
      if (notif.actor?.developerProfile) return 'developer';
      if (notif.actor?.companyProfile) return 'company';
      return null;
    case 'CHAT_MESSAGE':
      if (notif.task?.ownerUserId) {
        return notif.actorUserId === notif.task.ownerUserId ? 'company' : 'developer';
      }
      break;
    default:
      break;
  }

  if (notif.actor?.developerProfile) return 'developer';
  if (notif.actor?.companyProfile) return 'company';
  return null;
}

function resolveActorName({ actorRole, developerName, companyName }) {
  if (actorRole === 'developer') return developerName || companyName || 'Unknown';
  if (actorRole === 'company') return companyName || developerName || 'Unknown';
  return 'Unknown';
}

function buildPersonaVisibilityFilter({ userId, persona }) {
  if (persona === 'company') {
    return {
      OR: [
        { type: { in: ['APPLICATION_CREATED', 'TASK_INVITE_ACCEPTED', 'TASK_INVITE_DECLINED'] } },
        {
          type: { in: ['COMPLETION_REQUESTED', 'TASK_DISPUTE_OPENED'] },
          task: { is: { ownerUserId: userId } },
        },
        {
          type: 'REVIEW_CREATED',
          task: { is: { ownerUserId: userId } },
          AND: [{ actorUserId: { not: userId } }, { actorUserId: { not: null } }],
        },
        { type: { in: COMMON_VISIBLE_TYPES } },
        { type: { notIn: KNOWN_NOTIFICATION_TYPES } },
      ],
    };
  }

  return {
    OR: [
      {
        type: {
          in: [
            'APPLICATION_ACCEPTED',
            'APPLICATION_REJECTED',
            'TASK_COMPLETED',
            'TASK_DELETED',
            'PROJECT_DELETED',
            'TASK_INVITE_CREATED',
            'TASK_INVITE_CANCELLED',
          ],
        },
      },
      {
        type: { in: ['COMPLETION_REQUESTED', 'TASK_DISPUTE_OPENED'] },
        OR: [{ taskId: null }, { task: { is: { ownerUserId: { not: userId } } } }],
      },
      {
        type: 'REVIEW_CREATED',
        OR: [
          { taskId: null },
          { actorUserId: null },
          { task: { is: { ownerUserId: { not: userId } } } },
        ],
      },
      { type: { in: COMMON_VISIBLE_TYPES } },
      { type: { notIn: KNOWN_NOTIFICATION_TYPES } },
    ],
  };
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

  const visibilityFilter = buildPersonaVisibilityFilter({ userId, persona });
  const listWhere = {
    ...whereFilter,
    ...visibilityFilter,
  };

  const [items, total, cachedUnreadTotal] = await Promise.all([
    prisma.notification.findMany({
      where: listWhere,
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
      skip,
      take: size,
    }),
    prisma.notification.count({
      where: listWhere,
    }),
    getCachedUnreadNotificationCount(userId),
  ]);

  let unreadTotal = cachedUnreadTotal;
  if (unreadTotal === null) {
    unreadTotal = await prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
    await setCachedUnreadNotificationCount(userId, unreadTotal);
  }

  return {
    items: items.map((notif) => {
      const developerName = notif.actor?.developerProfile?.displayName || null;
      const companyName = notif.actor?.companyProfile?.companyName || null;
      const actorRole = resolveActorRole({ notif, userId });
      const actorName = resolveActorName({
        actorRole,
        developerName,
        companyName,
      });
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
        actor_role: actorRole,
        actor_name: actorName,
        developer_name: developerName,
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
    total,
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

    await invalidateCachedUnreadNotificationCount(userId);
  }

  return {
    updated: true,
    read_at: now.toISOString(),
  };
}
