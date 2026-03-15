import { prisma } from '../../db/prisma.js';
import { randomUUID } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { ApiError } from '../../utils/ApiError.js';
import { deleteFile, uploadFile } from '../../utils/cloudinary.js';
import { createNotification } from '../notifications/index.js';
import { mapChatMessageOutput } from './chat-message-output.js';

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

/**
 * Create a new message in a chat thread
 * User must be a participant in the thread with matching persona
 * Creates notification for the other participant
 */
export async function createMessage({ userId, persona, threadId, text = '', files = [] }) {
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
