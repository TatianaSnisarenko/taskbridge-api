import cron from 'node-cron';
import { processEmailOutboxBatch } from '../services/email-outbox/index.js';
import { env } from '../config/env.js';

async function runEmailOutboxWorker(trigger) {
  try {
    const result = await processEmailOutboxBatch();
    if (result.skipped) {
      console.log(`[Email Outbox] Worker skipped (${trigger}): ${result.skipped}`);
      return;
    }

    console.log('[Email Outbox] Worker run completed', {
      trigger,
      processed: result.processed,
      sent: result.sent,
      queuedForRetry: result.queuedForRetry,
      failed: result.failed,
      deferredTail: result.deferredTail,
    });
  } catch (error) {
    console.error('[Email Outbox] Worker failed', {
      trigger,
      error: error?.message,
    });
  }
}

export function startEmailOutboxWorker() {
  const task = cron.schedule(env.emailOutboxWorkerCron, async () => {
    await runEmailOutboxWorker('scheduled');
  });

  return {
    task,
    runOnce: async () => runEmailOutboxWorker('startup'),
  };
}
