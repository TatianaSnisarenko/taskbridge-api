import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

async function cleanupExpiredVerificationTokens() {
  if (!prisma.verificationToken) {
    console.warn('Verification token cleanup skipped: Prisma client is missing the model');
    return;
  }

  const now = new Date();
  const retentionMs = env.verificationTokenRetentionDays * 24 * 60 * 60 * 1000;
  const result = await prisma.verificationToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { usedAt: { not: null } },
        { createdAt: { lt: new Date(now.getTime() - retentionMs) } },
      ],
    },
  });

  console.log(`Verification token cleanup completed: removed ${result.count} token(s)`);
}

export function startVerificationTokenCleanup() {
  const task = cron.schedule('0 3 * * *', async () => {
    try {
      console.log('Verification token cleanup started (scheduled)');
      await cleanupExpiredVerificationTokens();
    } catch (error) {
      console.error('Verification token cleanup failed', error);
    }
  });

  return {
    task,
    runOnce: async () => {
      try {
        console.log('Verification token cleanup started (startup)');
        await cleanupExpiredVerificationTokens();
      } catch (error) {
        console.error('Verification token cleanup failed', error);
      }
    },
  };
}
