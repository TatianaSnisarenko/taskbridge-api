import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

async function cleanupUnverifiedUsers() {
  if (!prisma.user) {
    console.warn('Unverified user cleanup skipped: Prisma client is missing the model');
    return;
  }

  const cutoff = new Date(Date.now() - env.unverifiedUserDeletionAfterDays * 24 * 60 * 60 * 1000);

  const result = await prisma.user.deleteMany({
    where: {
      emailVerified: false,
      deletedAt: null,
      createdAt: { lt: cutoff },
    },
  });

  console.log(`Unverified user cleanup completed: removed ${result.count} user(s)`);
}

export function startUnverifiedUserCleanup() {
  const task = cron.schedule(env.unverifiedUserCleanupCron, async () => {
    try {
      console.log('Unverified user cleanup started (scheduled)');
      await cleanupUnverifiedUsers();
    } catch (error) {
      console.error('Unverified user cleanup failed', error);
    }
  });

  return {
    task,
    runOnce: async () => {
      try {
        console.log('Unverified user cleanup started (startup)');
        await cleanupUnverifiedUsers();
      } catch (error) {
        console.error('Unverified user cleanup failed', error);
      }
    },
  };
}
