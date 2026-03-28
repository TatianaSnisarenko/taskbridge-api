import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { mapChatMessageOutput } from './chat-message-output.js';
import {
  getCachedMyThreadsCatalog,
  setCachedMyThreadsCatalog,
} from '../../cache/threads-catalog.js';

async function loadParticipantProfiles(otherUserIds) {
  if (otherUserIds.length === 0) {
    return {
      developerByUserId: new Map(),
      companyByUserId: new Map(),
    };
  }

  const [developerProfiles, companyProfiles] = await Promise.all([
    prisma.developerProfile.findMany({
      where: { userId: { in: otherUserIds } },
      select: { userId: true, displayName: true, avatarUrl: true },
    }),
    prisma.companyProfile.findMany({
      where: { userId: { in: otherUserIds } },
      select: { userId: true, companyName: true, logoUrl: true },
    }),
  ]);

  return {
    developerByUserId: new Map(developerProfiles.map((profile) => [profile.userId, profile])),
    companyByUserId: new Map(companyProfiles.map((profile) => [profile.userId, profile])),
  };
}

/**
 * Get chat threads for the current user with pagination
 * Thread exists only for tasks with status IN_PROGRESS, DISPUTE, COMPLETED or FAILED
 * Caller must be either the company owner or accepted developer
 */
export async function getMyThreads({
  userId,
  persona,
  page = 1,
  size = 20,
  search = '',
  importantOnly = false,
}) {
  const cached = await getCachedMyThreadsCatalog({
    userId,
    persona,
    page,
    size,
    search,
    importantOnly,
  });

  if (cached) {
    return cached;
  }

  const skip = (page - 1) * size;

  const taskTitleFilter = search.trim()
    ? {
        contains: search.trim(),
        mode: 'insensitive',
      }
    : undefined;

  const personaFilter =
    persona === 'developer' ? { developerUserId: userId } : { companyUserId: userId };

  const importantFilter = importantOnly
    ? {
        reads: {
          some: {
            userId,
            importantAt: { not: null },
          },
        },
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.chatThread.findMany({
      where: {
        ...personaFilter,
        ...importantFilter,
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
            importantAt: true,
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
        ...importantFilter,
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

  const otherUserIds = [
    ...new Set(
      items.map((thread) =>
        thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId
      )
    ),
  ];
  const { developerByUserId, companyByUserId } = await loadParticipantProfiles(otherUserIds);

  const threadWithParticipants = items.map((thread) => {
    const otherUserId =
      thread.companyUserId === userId ? thread.developerUserId : thread.companyUserId;

    const devProfile = developerByUserId.get(otherUserId) || null;
    const compProfile = companyByUserId.get(otherUserId) || null;

    const userRead = thread.reads.find((r) => r.userId === userId);
    const lastReadAt = userRead?.lastReadAt || thread.createdAt;
    const unreadCount = thread.messages.filter((msg) => new Date(msg.sentAt) > lastReadAt).length;
    const importantAt = userRead?.importantAt || null;

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
      important_at: importantAt ? importantAt.toISOString() : null,
      created_at: thread.createdAt.toISOString(),
    };
  });

  const result = {
    items: threadWithParticipants,
    page,
    size,
    total,
  };

  await setCachedMyThreadsCatalog(
    {
      userId,
      persona,
      page,
      size,
      search,
      importantOnly,
    },
    result
  );

  return result;
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
          importantAt: true,
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
  const importantAt = userRead?.importantAt || null;

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
    important_at: importantAt ? importantAt.toISOString() : null,
    created_at: thread.createdAt.toISOString(),
  };
}

/**
 * Get messages for a chat thread with pagination.
 * Messages are returned in chronological order (oldest first).
 * User must be a participant in the thread and task must be IN_PROGRESS, DISPUTE, COMPLETED or FAILED.
 */
export async function getThreadMessages({
  userId,
  persona,
  threadId,
  page = 1,
  size = 50,
  importantOnly = false,
}) {
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
      where: {
        threadId,
        ...(importantOnly ? { importantAt: { not: null } } : {}),
      },
      select: {
        id: true,
        senderUserId: true,
        senderPersona: true,
        text: true,
        sentAt: true,
        attachments: {
          select: {
            url: true,
            name: true,
            type: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      skip,
      take: size,
      orderBy: {
        sentAt: 'asc',
      },
    }),
    prisma.chatMessage.count({
      where: {
        threadId,
        ...(importantOnly ? { importantAt: { not: null } } : {}),
      },
    }),
  ]);

  const messages = items.map((msg) =>
    mapChatMessageOutput(msg, {
      readAt: new Date(msg.sentAt) <= lastReadAt ? lastReadAt : null,
    })
  );

  return {
    items: messages,
    page,
    size,
    total,
  };
}
