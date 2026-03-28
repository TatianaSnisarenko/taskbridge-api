import { asyncHandler } from '../utils/asyncHandler.js';
import * as emailOutboxService from '../services/email-outbox/index.js';

export const getEmailOutboxOverview = asyncHandler(async (req, res) => {
  const overview = await emailOutboxService.getEmailOutboxOverview({
    limit: req.query.limit,
    status: req.query.status,
  });

  return res.status(200).json({
    counters: {
      pending: overview.counters.pending,
      retrying: overview.counters.retrying,
      processing: overview.counters.processing,
      sent: overview.counters.sent,
      failed: overview.counters.failed,
    },
    items: overview.items.map((item) => ({
      id: item.id,
      to: item.to,
      subject: item.subject,
      status: item.status,
      attempts: item.attempts,
      max_attempts: item.maxAttempts,
      next_attempt_at: item.nextAttemptAt,
      last_attempt_at: item.lastAttemptAt,
      sent_at: item.sentAt,
      expires_at: item.expiresAt,
      last_error: item.lastError,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    })),
  });
});
