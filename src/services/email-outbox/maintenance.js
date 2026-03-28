import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';

export async function cleanupEmailOutbox() {
  const now = new Date();
  const sentCutoff = new Date(
    now.getTime() - env.emailOutboxSentRetentionDays * 24 * 60 * 60 * 1000
  );
  const failedCutoff = new Date(
    now.getTime() - env.emailOutboxFailedRetentionDays * 24 * 60 * 60 * 1000
  );

  const [expiredResult, sentResult, failedResult] = await prisma.$transaction([
    prisma.emailOutbox.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    }),
    prisma.emailOutbox.deleteMany({
      where: {
        status: 'SENT',
        sentAt: { lt: sentCutoff },
      },
    }),
    prisma.emailOutbox.deleteMany({
      where: {
        status: 'FAILED',
        updatedAt: { lt: failedCutoff },
      },
    }),
  ]);

  return {
    deletedExpired: expiredResult.count,
    deletedSent: sentResult.count,
    deletedFailed: failedResult.count,
  };
}

export async function getEmailOutboxOverview({ limit = 20, status } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const statusFilter =
    typeof status === 'string' && status.trim().length > 0 ? status.trim().toUpperCase() : null;

  const where = statusFilter ? { status: statusFilter } : {};

  const [pending, retrying, processing, sent, failed, items] = await Promise.all([
    prisma.emailOutbox.count({ where: { status: 'PENDING' } }),
    prisma.emailOutbox.count({ where: { status: 'RETRYING' } }),
    prisma.emailOutbox.count({ where: { status: 'PROCESSING' } }),
    prisma.emailOutbox.count({ where: { status: 'SENT' } }),
    prisma.emailOutbox.count({ where: { status: 'FAILED' } }),
    prisma.emailOutbox.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      select: {
        id: true,
        to: true,
        subject: true,
        status: true,
        attempts: true,
        maxAttempts: true,
        nextAttemptAt: true,
        lastAttemptAt: true,
        sentAt: true,
        expiresAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  return {
    counters: {
      pending,
      retrying,
      processing,
      sent,
      failed,
    },
    items,
  };
}
