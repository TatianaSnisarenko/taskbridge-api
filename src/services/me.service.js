import { prisma } from '../db/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { createNotification } from './notifications.service.js';

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
export async function getMyThreads({ userId, persona, page = 1, size = 20, search = '' }) {
  const skip = (page - 1) * size;

  // Build search filter for task title if provided
  const taskTitleFilter = search.trim()
    ? {
        contains: search.trim(),
        mode: 'insensitive',
      }
    : undefined;

  // Build persona filter based on which role user is querying as
  const personaFilter =
    persona === 'developer' ? { developerUserId: userId } : { companyUserId: userId };

  // Fetch threads where user is a participant in the specified role, sorted by last_message_at DESC
  const [items, total] = await Promise.all([
    prisma.chatThread.findMany({
      where: {
        ...personaFilter,
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
        ...personaFilter,
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
export async function getThreadById({ userId, persona, threadId }) {
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

  // Verify user matches the persona role in this thread
  if (persona === 'developer') {
    if (thread.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (thread.companyUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
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
/**
 * Get messages for a chat thread with pagination.
 * Messages are returned in chronological order (oldest first).
 * User must be a participant in the thread and task must be IN_PROGRESS or COMPLETED.
 */
export async function getThreadMessages({ userId, persona, threadId, page = 1, size = 50 }) {
  const skip = (page - 1) * size;

  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      companyUserId: true,
      developerUserId: true,
      taskId: true,
      createdAt: true,
      task: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
        },
      },
      reads: {
        where: { userId },
        select: {
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

  // Verify user matches the persona role in this thread
  if (persona === 'developer') {
    if (thread.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (thread.companyUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
  }

  // Verify task status is IN_PROGRESS or COMPLETED
  if (!['IN_PROGRESS', 'COMPLETED'].includes(thread.task.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot access messages for this task status');
  }

  // Get the user's lastReadAt timestamp
  const userRead = thread.reads[0];
  const lastReadAt = userRead?.lastReadAt || thread.createdAt;

  // Fetch messages with pagination, sorted chronologically (ascending)
  const [items, total] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { threadId },
      select: {
        id: true,
        senderUserId: true,
        senderPersona: true,
        text: true,
        sentAt: true,
      },
      skip,
      take: size,
      orderBy: {
        sentAt: 'asc', // Chronological order - oldest first
      },
    }),
    prisma.chatMessage.count({
      where: { threadId },
    }),
  ]);

  // Add read_at based on lastReadAt timestamp
  const messages = items.map((msg) => ({
    id: msg.id,
    sender_user_id: msg.senderUserId,
    sender_persona: msg.senderPersona,
    text: msg.text,
    sent_at: msg.sentAt.toISOString(),
    // If message was sent before or at the last read time, user has read it
    read_at: new Date(msg.sentAt) <= lastReadAt ? lastReadAt.toISOString() : null,
  }));

  return {
    items: messages,
    page,
    size,
    total,
  };
}

/**
 * Create a new message in a chat thread
 * User must be a participant in the thread with matching persona
 * Creates notification for the other participant
 */
export async function createMessage({ userId, persona, threadId, text }) {
  // Fetch thread and verify access
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      taskId: true,
      companyUserId: true,
      developerUserId: true,
      task: {
        select: {
          id: true,
          status: true,
          deletedAt: true,
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

  // Verify user matches the persona role in this thread
  if (persona === 'developer') {
    if (thread.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (thread.companyUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
  }

  // Verify task status is IN_PROGRESS or COMPLETED
  if (!['IN_PROGRESS', 'COMPLETED'].includes(thread.task.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot send messages for this task status');
  }

  const now = new Date();

  // Create message and update thread's lastMessageAt in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the message
    const message = await tx.chatMessage.create({
      data: {
        threadId,
        senderUserId: userId,
        senderPersona: persona,
        text: text.trim(),
        sentAt: now,
      },
      select: {
        id: true,
        threadId: true,
        senderUserId: true,
        senderPersona: true,
        text: true,
        sentAt: true,
      },
    });

    // Update thread's lastMessageAt
    await tx.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: now },
    });

    // Determine the recipient (other participant)
    const recipientUserId = persona === 'developer' ? thread.companyUserId : thread.developerUserId;

    // Create notification for the other participant
    await createNotification({
      client: tx,
      userId: recipientUserId,
      actorUserId: userId,
      taskId: thread.taskId,
      type: 'CHAT_MESSAGE',
      payload: {
        thread_id: threadId,
        task_id: thread.taskId,
      },
    });

    return message;
  });

  // Return message in response format
  return {
    id: result.id,
    thread_id: result.threadId,
    sender_user_id: result.senderUserId,
    sender_persona: result.senderPersona,
    text: result.text,
    sent_at: result.sentAt.toISOString(),
    read_at: null, // New message is always unread
  };
}
