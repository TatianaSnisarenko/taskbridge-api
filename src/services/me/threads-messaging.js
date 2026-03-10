import { prisma } from '../../db/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { createNotification } from '../notifications/index.js';

/**
 * Create a new message in a chat thread
 * User must be a participant in the thread with matching persona
 * Creates notification for the other participant
 */
export async function createMessage({ userId, persona, threadId, text }) {
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
    throw new ApiError(403, 'FORBIDDEN', 'Cannot send messages for this task status');
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
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

    await tx.chatThread.update({
      where: { id: threadId },
      data: { lastMessageAt: now },
    });

    const recipientUserId = persona === 'developer' ? thread.companyUserId : thread.developerUserId;

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

  return {
    id: result.id,
    thread_id: result.threadId,
    sender_user_id: result.senderUserId,
    sender_persona: result.senderPersona,
    text: result.text,
    sent_at: result.sentAt.toISOString(),
    read_at: null,
  };
}

/**
 * Mark all messages in a thread as read for the current user
 * User must be a participant in the thread with matching persona
 */
export async function markThreadAsRead({ userId, persona, threadId }) {
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
    throw new ApiError(403, 'FORBIDDEN', 'Cannot mark messages as read for this task status');
  }

  const now = new Date();

  await prisma.chatThreadRead.upsert({
    where: {
      threadId_userId: {
        threadId,
        userId,
      },
    },
    create: {
      threadId,
      userId,
      lastReadAt: now,
    },
    update: {
      lastReadAt: now,
    },
  });

  return {
    thread_id: threadId,
    read_at: now.toISOString(),
  };
}
