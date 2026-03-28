import { prisma } from '../../db/prisma.js';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { ApiError } from '../../utils/ApiError.js';
import { deleteFile, uploadFile } from '../../utils/cloudinary.js';
import { createNotification } from '../notifications/index.js';
import { mapChatMessageOutput } from './chat-message-output.js';
import { invalidateCachedMyThreadsCatalog } from '../../cache/threads-catalog.js';

const CHAT_ATTACHMENT_UPLOAD_FOLDER = 'teamup/chat-attachments';

const MOJIBAKE_PATTERN = /[ÐÑÃ]/;

function decodeUploadedFileName(fileName) {
  if (typeof fileName !== 'string' || fileName.trim() === '') {
    return 'file.bin';
  }

  if (!MOJIBAKE_PATTERN.test(fileName)) {
    return fileName;
  }

  const decoded = Buffer.from(fileName, 'latin1').toString('utf8');
  if (!decoded || decoded.includes('\uFFFD')) {
    return fileName;
  }

  return decoded;
}

function splitBaseNameAndExtension(fileName) {
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf('.');

  if (dotIndex <= 0 || dotIndex === trimmed.length - 1) {
    return { baseName: trimmed, extension: '' };
  }

  return {
    baseName: trimmed.slice(0, dotIndex),
    extension: trimmed.slice(dotIndex).toLowerCase(),
  };
}

function normalizeAttachmentName(originalName) {
  if (typeof originalName !== 'string' || originalName.trim() === '') {
    return 'file.bin';
  }

  const { baseName, extension } = splitBaseNameAndExtension(originalName);
  const normalizedBaseName = baseName
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '');

  const safeBaseName = normalizedBaseName || 'file';

  return `${safeBaseName}${extension}`;
}

function buildAttachmentPublicId(originalName) {
  const normalizedName = normalizeAttachmentName(originalName);
  return `${CHAT_ATTACHMENT_UPLOAD_FOLDER}/${randomUUID()}-${normalizedName}`;
}

async function cleanupUploadedAttachments(attachments) {
  await Promise.allSettled(
    attachments.map((attachment) => deleteFile(attachment.publicId, attachment.resourceType))
  );
}

async function uploadMessageAttachments(files) {
  const uploadedAttachments = [];

  try {
    for (const file of files) {
      const originalName = decodeUploadedFileName(file.originalname);

      const uploadResult = await uploadFile(file.buffer, {
        resource_type: 'raw',
        public_id: buildAttachmentPublicId(originalName),
        filename_override: originalName,
        discard_original_filename: false,
      });

      uploadedAttachments.push({
        url: uploadResult.secure_url,
        name: originalName,
        type: file.mimetype || 'application/octet-stream',
        publicId: uploadResult.public_id,
        resourceType: uploadResult.resource_type || 'raw',
      });
    }

    return uploadedAttachments;
  } catch (error) {
    await cleanupUploadedAttachments(uploadedAttachments);
    throw error;
  }
}

async function getAuthorizedThread({ userId, persona, threadId }) {
  const thread = await prisma.chatThread.findUnique({
    where: { id: threadId },
    select: {
      id: true,
      createdAt: true,
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
    throw new ApiError(403, 'FORBIDDEN', 'Cannot access messages for this task status');
  }

  return thread;
}

/**
 * Create a new message in a chat thread
 * User must be a participant in the thread with matching persona
 * Creates notification for the other participant
 */
export async function createMessage({ userId, persona, threadId, text = '', files = [] }) {
  const thread = await getAuthorizedThread({ userId, persona, threadId });

  const now = new Date();
  const normalizedText = typeof text === 'string' ? text.trim() : '';
  const uploadedAttachments = await uploadMessageAttachments(files);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          threadId,
          senderUserId: userId,
          senderPersona: persona,
          text: normalizedText,
          sentAt: now,
          ...(uploadedAttachments.length > 0
            ? {
                attachments: {
                  create: uploadedAttachments.map((attachment) => ({
                    url: attachment.url,
                    name: attachment.name,
                    type: attachment.type,
                  })),
                },
              }
            : {}),
        },
        select: {
          id: true,
          threadId: true,
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
      });

      await tx.chatThread.update({
        where: { id: threadId },
        data: { lastMessageAt: now },
      });

      const recipientUserId =
        persona === 'developer' ? thread.companyUserId : thread.developerUserId;

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

      await Promise.all([
        invalidateCachedMyThreadsCatalog(userId),
        invalidateCachedMyThreadsCatalog(recipientUserId),
      ]);

      return message;
    });

    return mapChatMessageOutput(result);
  } catch (error) {
    await cleanupUploadedAttachments(uploadedAttachments);
    throw error;
  }
}

/**
 * Mark all messages in a thread as read for the current user
 * User must be a participant in the thread with matching persona
 */
export async function markThreadAsRead({ userId, persona, threadId }) {
  await getAuthorizedThread({ userId, persona, threadId });

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

  await invalidateCachedMyThreadsCatalog(userId);

  return {
    thread_id: threadId,
    read_at: now.toISOString(),
  };
}

/**
 * Mark a thread as important for the current user
 */
export async function markThreadAsImportant({ userId, persona, threadId }) {
  const thread = await getAuthorizedThread({ userId, persona, threadId });
  const now = new Date();

  const updated = await prisma.chatThreadRead.upsert({
    where: {
      threadId_userId: {
        threadId,
        userId,
      },
    },
    create: {
      threadId,
      userId,
      lastReadAt: thread.createdAt,
      importantAt: now,
    },
    update: {
      importantAt: now,
    },
    select: {
      threadId: true,
      importantAt: true,
    },
  });

  await invalidateCachedMyThreadsCatalog(userId);

  return {
    thread_id: updated.threadId,
    important_at: updated.importantAt.toISOString(),
  };
}

/**
 * Remove important mark from a thread for the current user
 */
export async function markThreadAsUnimportant({ userId, persona, threadId }) {
  await getAuthorizedThread({ userId, persona, threadId });

  await prisma.chatThreadRead.updateMany({
    where: {
      threadId,
      userId,
    },
    data: {
      importantAt: null,
    },
  });

  await invalidateCachedMyThreadsCatalog(userId);

  return {
    thread_id: threadId,
    important_at: null,
  };
}

/**
 * Mark a message as important in a chat thread for an authorized participant
 */
export async function markMessageAsImportant({ userId, persona, threadId, messageId }) {
  await getAuthorizedThread({ userId, persona, threadId });

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      threadId,
    },
    select: { id: true },
  });

  if (!message) {
    throw new ApiError(404, 'NOT_FOUND', 'Message not found');
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { importantAt: new Date() },
    select: { id: true, importantAt: true },
  });

  return {
    id: updated.id,
    important_at: updated.importantAt.toISOString(),
  };
}

/**
 * Remove important mark from a message in a chat thread for an authorized participant
 */
export async function markMessageAsUnimportant({ userId, persona, threadId, messageId }) {
  await getAuthorizedThread({ userId, persona, threadId });

  const message = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      threadId,
    },
    select: { id: true },
  });

  if (!message) {
    throw new ApiError(404, 'NOT_FOUND', 'Message not found');
  }

  const updated = await prisma.chatMessage.update({
    where: { id: messageId },
    data: { importantAt: null },
    select: { id: true, importantAt: true },
  });

  return {
    id: updated.id,
    important_at: updated.importantAt?.toISOString() || null,
  };
}
