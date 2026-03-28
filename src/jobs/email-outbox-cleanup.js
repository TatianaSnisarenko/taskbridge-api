import cron from 'node-cron';
import { cleanupEmailOutbox } from '../services/email-outbox/index.js';
import { env } from '../config/env.js';

async function runEmailOutboxCleanup(trigger) {
  try {
    const result = await cleanupEmailOutbox();
    console.log('[Email Outbox] Cleanup completed', {
      trigger,
      deletedExpired: result.deletedExpired,
      deletedSent: result.deletedSent,
      deletedFailed: result.deletedFailed,
    });
  } catch (error) {
    console.error('[Email Outbox] Cleanup failed', {
      trigger,
      error: error?.message,
    });
  }
}

export function startEmailOutboxCleanup() {
  const task = cron.schedule(env.emailOutboxCleanupCron, async () => {
    await runEmailOutboxCleanup('scheduled');
  });

  return {
    task,
    runOnce: async () => runEmailOutboxCleanup('startup'),
  };
}
