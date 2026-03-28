import crypto from 'crypto';

import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { getRedisClient } from '../../cache/redis.js';
import { sendEmail } from '../email/index.js';
import {
  calculateBackoffDelayMs,
  isRecoverableEmailError,
  isThrottleEmailError,
  parseRetryAfterMs,
  toErrorSummary,
} from './retry-policy.js';

const WORKER_LOCK_KEY = 'email:outbox:worker:lock';
const THROTTLE_UNTIL_KEY = 'email:outbox:throttle_until';

function getRedisClientIfEnabled() {
  if (!env.redisEnabled) {
    return null;
  }

  const client = getRedisClient();
  if (!client?.isOpen) {
    return null;
  }

  return client;
}

async function acquireWorkerLock(lockTtlMs) {
  const redis = getRedisClientIfEnabled();
  if (!redis) {
    return { acquired: true, token: null, redis: null };
  }

  const token = crypto.randomUUID();
  const locked = await redis.set(WORKER_LOCK_KEY, token, {
    NX: true,
    PX: Math.max(1000, Number(lockTtlMs) || 60000),
  });

  return {
    acquired: locked === 'OK',
    token,
    redis,
  };
}

async function releaseWorkerLock({ redis, token }) {
  if (!redis || !token) {
    return;
  }

  const current = await redis.get(WORKER_LOCK_KEY);
  if (current === token) {
    await redis.del(WORKER_LOCK_KEY);
  }
}

async function getGlobalThrottlePauseMs() {
  const redis = getRedisClientIfEnabled();
  if (!redis) {
    return 0;
  }

  const raw = await redis.get(THROTTLE_UNTIL_KEY);
  if (!raw) {
    return 0;
  }

  const throttleUntil = Number(raw);
  if (!Number.isFinite(throttleUntil) || throttleUntil <= Date.now()) {
    await redis.del(THROTTLE_UNTIL_KEY);
    return 0;
  }

  return throttleUntil - Date.now();
}

async function setGlobalThrottlePause(untilTs) {
  const redis = getRedisClientIfEnabled();
  if (!redis) {
    return;
  }

  const pauseMs = Math.max(0, Math.floor(untilTs - Date.now()));
  if (pauseMs <= 0) {
    return;
  }

  await redis.set(THROTTLE_UNTIL_KEY, String(untilTs), {
    PX: pauseMs,
  });
}

async function claimDueOutboxItems({ batchSize, now }) {
  const safeBatchSize = Math.max(1, Number(batchSize) || 20);

  return prisma.$transaction(async (tx) => {
    const staleBefore = new Date(now.getTime() - env.emailOutboxProcessingTimeoutMs);

    await tx.emailOutbox.updateMany({
      where: {
        status: 'PROCESSING',
        processingStarted: { lt: staleBefore },
      },
      data: {
        status: 'RETRYING',
        processingStarted: null,
        nextAttemptAt: now,
      },
    });

    await tx.emailOutbox.updateMany({
      where: {
        status: { in: ['PENDING', 'RETRYING', 'PROCESSING'] },
        expiresAt: { lte: now },
      },
      data: {
        status: 'FAILED',
        processingStarted: null,
        lastError: 'Message expired before delivery',
      },
    });

    const rows = await tx.$queryRaw`
      SELECT id
      FROM email_outbox
      WHERE status IN ('PENDING', 'RETRYING')
        AND next_attempt_at <= ${now}
        AND expires_at > ${now}
        AND attempts < max_attempts
      ORDER BY next_attempt_at ASC
      LIMIT ${safeBatchSize}
      FOR UPDATE SKIP LOCKED
    `;

    const ids = rows.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }

    await tx.emailOutbox.updateMany({
      where: { id: { in: ids } },
      data: {
        status: 'PROCESSING',
        processingStarted: now,
      },
    });

    return ids;
  });
}

function calculateNextAttemptAt({ record, now, error }) {
  const retryAfterMs = parseRetryAfterMs(error);
  const delayMs = calculateBackoffDelayMs({
    attempt: record.attempts + 1,
    baseDelayMs: env.emailOutboxBaseDelayMs,
    maxDelayMs: env.emailOutboxMaxDelayMs,
    retryAfterMs,
    jitterRatio: env.emailOutboxJitterRatio,
  });

  return new Date(now.getTime() + delayMs);
}

export async function processEmailOutboxBatch({ batchSize = env.emailOutboxBatchSize } = {}) {
  if (!env.emailOutboxEnabled) {
    return { skipped: 'disabled', processed: 0, queuedForRetry: 0, failed: 0, sent: 0 };
  }

  const throttlePauseMs = await getGlobalThrottlePauseMs();
  if (throttlePauseMs > 0) {
    return {
      skipped: 'throttled',
      pauseMs: throttlePauseMs,
      processed: 0,
      queuedForRetry: 0,
      failed: 0,
      sent: 0,
    };
  }

  const lock = await acquireWorkerLock(env.emailOutboxWorkerLockTtlMs);
  if (!lock.acquired) {
    return { skipped: 'locked', processed: 0, queuedForRetry: 0, failed: 0, sent: 0 };
  }

  const now = new Date();

  try {
    const claimedIds = await claimDueOutboxItems({ batchSize, now });
    if (claimedIds.length === 0) {
      return { skipped: 'empty', processed: 0, queuedForRetry: 0, failed: 0, sent: 0 };
    }

    const records = await prisma.emailOutbox.findMany({
      where: { id: { in: claimedIds } },
      orderBy: { nextAttemptAt: 'asc' },
    });

    let sent = 0;
    let queuedForRetry = 0;
    let failed = 0;
    let deferredTail = false;

    for (let index = 0; index < records.length; index += 1) {
      const record = records[index];

      try {
        await sendEmail({
          to: record.to,
          subject: record.subject,
          text: record.text,
          html: record.html,
        });

        sent += 1;

        await prisma.emailOutbox.update({
          where: { id: record.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            processingStarted: null,
            lastAttemptAt: new Date(),
            lastError: null,
          },
        });
      } catch (error) {
        const attemptAfterFailure = record.attempts + 1;
        const recoverable = isRecoverableEmailError(error);
        const throttle = isThrottleEmailError(error);
        const errorSummary = toErrorSummary(error);

        if (recoverable && attemptAfterFailure < record.maxAttempts && record.expiresAt > now) {
          queuedForRetry += 1;
          const nextAttemptAt = calculateNextAttemptAt({ record, now, error });

          await prisma.emailOutbox.update({
            where: { id: record.id },
            data: {
              status: 'RETRYING',
              attempts: attemptAfterFailure,
              nextAttemptAt,
              processingStarted: null,
              lastAttemptAt: new Date(),
              lastError: errorSummary,
            },
          });

          if (throttle) {
            deferredTail = true;
            await setGlobalThrottlePause(nextAttemptAt.getTime());

            const remainingIds = records.slice(index + 1).map((item) => item.id);
            if (remainingIds.length > 0) {
              const pauseUntil = new Date(
                Date.now() + Math.max(env.emailOutboxThrottleBatchPauseMs, 1000)
              );

              await prisma.emailOutbox.updateMany({
                where: { id: { in: remainingIds } },
                data: {
                  status: 'RETRYING',
                  processingStarted: null,
                  nextAttemptAt: pauseUntil,
                  lastError: 'Deferred after upstream throttling',
                },
              });
            }

            break;
          }
        } else {
          failed += 1;
          await prisma.emailOutbox.update({
            where: { id: record.id },
            data: {
              status: 'FAILED',
              attempts: attemptAfterFailure,
              processingStarted: null,
              lastAttemptAt: new Date(),
              lastError: errorSummary,
            },
          });
        }
      }
    }

    return {
      processed: records.length,
      sent,
      queuedForRetry,
      failed,
      deferredTail,
    };
  } finally {
    await releaseWorkerLock(lock);
  }
}
