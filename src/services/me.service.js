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

/**
 * Get chat threads for the current user with pagination
 * Thread exists only for tasks with status IN_PROGRESS or COMPLETED
 * Caller must be either the company owner or accepted developer
 */
export async function getMyThreads({ userId, page = 1, size = 20, search = '' }) {
  const skip = (page - 1) * size;

  // Build search filter for task title if provided
  const taskTitleFilter = search.trim()
    ? {
        contains: search.trim(),
        mode: 'insensitive',
      }
    : undefined;

  // Fetch threads where user is a participant, sorted by last_message_at DESC
  const [items, total] = await Promise.all([
    prisma.chatThread.findMany({
      where: {
        OR: [{ companyUserId: userId }, { developerUserId: userId }],
        task: {
          status: {
            in: ['IN_PROGRESS', 'COMPLETED'],
          },
          deletedAt: null,
          ...(taskTitleFilter && { title: taskTitleFilter }),
        },
      },
      select: {
        id: true,
        taskId: true,
        companyUserId: true,
        developerUserId: true,
        createdAt: true,
        lastMessageAt: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        messages: {
          select: {
            id: true,
            text: true,
            senderUserId: true,
            senderPersona: true,
            sentAt: true,
          },
          orderBy: { sentAt: 'desc' },
        },
        reads: {
          select: {
            userId: true,
            lastReadAt: true,
          },
        },
      },
      skip,
      take: size,
      orderBy: {
        lastMessageAt: 'desc',
      },
    }),
    prisma.chatThread.count({
      where: {
        OR: [{ companyUserId: userId }, { developerUserId: userId }],
        task: {
          status: {
            in: ['IN_PROGRESS', 'COMPLETED'],
          },
          deletedAt: null,
          ...(taskTitleFilter && { title: taskTitleFilter }),
        },
      },
    }),
  ]);

  // Fetch other participant profiles (company or developer info)
  const threadWithParticipants = await Promise.all(
    items.map(async (thread) => {
      // Determine the other participant ID
      const otherUserId =
        thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId;

      // Fetch other participant profile
      const [devProfile, compProfile] = await Promise.all([
        prisma.developerProfile.findUnique({
          where: { userId: otherUserId },
          select: { userId: true, displayName: true, avatarUrl: true },
        }),
        prisma.companyProfile.findUnique({
          where: { userId: otherUserId },
          select: { userId: true, companyName: true, logoUrl: true },
        }),
      ]);

      // Calculate unread count for current user
      const userRead = thread.reads.find((r) => r.userId === userId);
      const lastReadAt = userRead?.lastReadAt || thread.createdAt;
      const unreadCount = thread.messages.filter((msg) => new Date(msg.sentAt) > lastReadAt).length;

      // Get the most recent message (first in sorted desc order)
      const mostRecentMessage = thread.messages.length > 0 ? thread.messages[0] : null;

      return {
        thread_id: thread.id,
        task: {
          task_id: thread.task.id,
          title: thread.task.title,
          status: thread.task.status,
        },
        other_participant: {
          user_id: otherUserId,
          display_name: devProfile?.displayName || compProfile?.companyName,
          company_name: compProfile?.companyName || null,
          avatar_url: devProfile?.avatarUrl || compProfile?.logoUrl || null,
        },
        last_message: mostRecentMessage
          ? {
              id: mostRecentMessage.id,
              text: mostRecentMessage.text,
              sender_user_id: mostRecentMessage.senderUserId,
              sender_persona: mostRecentMessage.senderPersona,
              sent_at: mostRecentMessage.sentAt.toISOString(),
            }
          : null,
        unread_count: unreadCount,
        created_at: thread.createdAt.toISOString(),
      };
    })
  );

  return {
    items: threadWithParticipants,
    page,
    size,
    total,
  };
}
/**
 * Get a single chat thread by ID. User must be a participant in the thread
 * and the associated task must be IN_PROGRESS or COMPLETED.
 */
export async function getThreadById({ userId, threadId }) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      taskId: true,
      companyUserId: true,
      developerUserId: true,
      createdAt: true,
      lastMessageAt: true,
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          deletedAt: true,
        },
      },
      messages: {
        select: {
          id: true,
          text: true,
          senderUserId: true,
          senderPersona: true,
          sentAt: true,
        },
        orderBy: { sentAt: 'desc' },
      },
      reads: {
        select: {
          userId: true,
          lastReadAt: true,
        },
      },
    },
  });

  if (!thread) {
    throw new ApiError(404, 'NOT_FOUND', 'Chat thread not found');
  }

  if (thread.task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Chat thread not found');
  }

  // Verify user is a participant in this thread
  if (thread.companyUserId !== userId && thread.developerUserId !== userId) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a participant in this thread');
  }

  // Verify task status is IN_PROGRESS or COMPLETED
  if (!['IN_PROGRESS', 'COMPLETED'].includes(thread.task.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot access thread for this task status');
  }

  // Determine the other participant ID
  const otherUserId =
    thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId;

  // Fetch other participant profile
  const [devProfile, compProfile] = await Promise.all([
    prisma.developerProfile.findUnique({
      where: { userId: otherUserId },
      select: { userId: true, displayName: true, avatarUrl: true },
    }),
    prisma.companyProfile.findUnique({
      where: { userId: otherUserId },
      select: { userId: true, companyName: true, logoUrl: true },
    }),
  ]);

  // Calculate unread count for current user
  const userRead = thread.reads.find((r) => r.userId === userId);
  const lastReadAt = userRead?.lastReadAt || thread.createdAt;
  const unreadCount = thread.messages.filter((msg) => new Date(msg.sentAt) > lastReadAt).length;

  // Get the most recent message (first in sorted desc order)
  const mostRecentMessage = thread.messages.length > 0 ? thread.messages[0] : null;

  return {
    thread_id: thread.id,
    task: {
      task_id: thread.task.id,
      title: thread.task.title,
      status: thread.task.status,
    },
    other_participant: {
      user_id: otherUserId,
      display_name: devProfile?.displayName || compProfile?.companyName,
      company_name: compProfile?.companyName || null,
      avatar_url: devProfile?.avatarUrl || compProfile?.logoUrl || null,
    },
    last_message: mostRecentMessage
      ? {
          id: mostRecentMessage.id,
          text: mostRecentMessage.text,
          sender_user_id: mostRecentMessage.senderUserId,
          sender_persona: mostRecentMessage.senderPersona,
          sent_at: mostRecentMessage.sentAt.toISOString(),
        }
      : null,
    unread_count: unreadCount,
    created_at: thread.createdAt.toISOString(),
  };
}
