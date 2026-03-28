import { prisma } from '../../db/prisma.js';
import { invalidateCachedMyThreadsCatalog } from '../../cache/threads-catalog.js';

/**
 * Create a chat thread for a task if it doesn't already exist
 * @param {string} taskId - The task ID
 * @param {string} companyUserId - The company (task owner) user ID
 * @param {string} developerUserId - The developer (accepted applicant) user ID
 * @returns {Promise<{id: string} | null>} Thread object or null if already exists
 */
export async function getOrCreateChatThread({ taskId, companyUserId, developerUserId }) {
  try {
    // Try to create or get existing thread
    // Using upsert to handle the case where thread might already exist
    const thread = await prisma.chatThread.upsert({
      where: { taskId },
      update: {}, // Don't update if exists
      create: {
        taskId,
        companyUserId,
        developerUserId,
        createdAt: new Date(),
        // lastMessageAt is nullable and will be set when first message is sent
      },
    });

    await Promise.all([
      invalidateCachedMyThreadsCatalog(companyUserId),
      invalidateCachedMyThreadsCatalog(developerUserId),
    ]);

    return thread;
  } catch (err) {
    console.error(`[ChatService] Failed to create/get chat thread for task ${taskId}:`, err);
    // Return null instead of throwing - thread creation failure should not break accept
    return null;
  }
}
