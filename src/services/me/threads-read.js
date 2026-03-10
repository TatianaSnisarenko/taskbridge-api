import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';

/**
 * Get chat threads for the current user with pagination
 * Thread exists only for tasks with status IN_PROGRESS, DISPUTE, COMPLETED or FAILED
 * Caller must be either the company owner or accepted developer
 */
export async function getMyThreads({ userId, persona, page = 1, size = 20, search = '' }) {
  const skip = (page - 1) * size;

  const taskTitleFilter = search.trim()
    ? {
        contains: search.trim(),
        mode: 'insensitive',
      }
    : undefined;

  const personaFilter =
    persona === 'developer' ? { developerUserId: userId } : { companyUserId: userId };

  const [items, total] = await Promise.all([
    prisma.chatThread.findMany({
      where: {
        ...personaFilter,
        task: {
          status: {
            in: ['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'],
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
            in: ['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'],
          },
          deletedAt: null,
          ...(taskTitleFilter && { title: taskTitleFilter }),
        },
      },
    }),
  ]);

  const threadWithParticipants = await Promise.all(
    items.map(async (thread) => {
      const otherUserId =
        thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId;

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

      const userRead = thread.reads.find((r) => r.userId === userId);
      const lastReadAt = userRead?.lastReadAt || thread.createdAt;
      const unreadCount = thread.messages.filter((msg) => new Date(msg.sentAt) > lastReadAt).length;

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
 * and the associated task must be IN_PROGRESS, DISPUTE, COMPLETED or FAILED.
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

  if (persona === 'developer') {
    if (thread.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (thread.companyUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
  }

  if (!['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'].includes(thread.task.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot access thread for this task status');
  }

  const otherUserId =
    thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId;

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

  const userRead = thread.reads.find((r) => r.userId === userId);
  const lastReadAt = userRead?.lastReadAt || thread.createdAt;
  const unreadCount = thread.messages.filter((msg) => new Date(msg.sentAt) > lastReadAt).length;

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
 * User must be a participant in the thread and task must be IN_PROGRESS, DISPUTE, COMPLETED or FAILED.
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

  if (persona === 'developer') {
    if (thread.developerUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the developer in this thread');
    }
  } else if (persona === 'company') {
    if (thread.companyUserId !== userId) {
      throw new ApiError(403, 'FORBIDDEN', 'You are not the company representative in this thread');
    }
  }

  if (!['IN_PROGRESS', 'DISPUTE', 'COMPLETED', 'FAILED'].includes(thread.task.status)) {
    throw new ApiError(403, 'FORBIDDEN', 'Cannot access messages for this task status');
  }

  const userRead = thread.reads[0];
  const lastReadAt = userRead?.lastReadAt || thread.createdAt;

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
        sentAt: 'asc',
      },
    }),
    prisma.chatMessage.count({
      where: { threadId },
    }),
  ]);

  const messages = items.map((msg) => ({
    id: msg.id,
    sender_user_id: msg.senderUserId,
    sender_persona: msg.senderPersona,
    text: msg.text,
    sent_at: msg.sentAt.toISOString(),
    read_at: new Date(msg.sentAt) <= lastReadAt ? lastReadAt.toISOString() : null,
  }));

  return {
    items: messages,
    page,
    size,
    total,
  };
}
