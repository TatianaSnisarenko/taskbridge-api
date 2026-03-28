import { URL } from 'node:url';

import { prisma } from '../../db/prisma.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../email/index.js';
import { buildVerifyEmailTemplate } from '../../templates/email/verify-email.js';
import { buildResetPasswordTemplate } from '../../templates/email/reset-password.js';
import { isRecoverableEmailError, toErrorSummary } from './retry-policy.js';

function resolveMessageExpiry(ttlHours = env.emailOutboxMessageTtlHours) {
  const safeHours = Math.max(1, Number(ttlHours) || 24);
  return new Date(Date.now() + safeHours * 60 * 60 * 1000);
}

export async function enqueueEmailOutbox({
  to,
  subject,
  text,
  html,
  maxAttempts = env.emailOutboxMaxAttempts,
  ttlHours = env.emailOutboxMessageTtlHours,
}) {
  if (!env.emailOutboxEnabled) {
    return null;
  }

  return prisma.emailOutbox.create({
    data: {
      to,
      subject,
      text,
      html,
      status: 'PENDING',
      maxAttempts: Math.max(1, Number(maxAttempts) || 8),
      nextAttemptAt: new Date(),
      expiresAt: resolveMessageExpiry(ttlHours),
    },
  });
}

export async function sendEmailWithRecovery({
  to,
  subject,
  text,
  html,
  maxAttempts = env.emailOutboxMaxAttempts,
  ttlHours = env.emailOutboxMessageTtlHours,
}) {
  try {
    await sendEmail({ to, subject, text, html });
    return { sent: true, queued: false };
  } catch (error) {
    if (!isRecoverableEmailError(error) || !env.emailOutboxEnabled) {
      throw error;
    }

    await enqueueEmailOutbox({ to, subject, text, html, maxAttempts, ttlHours });

    console.warn('[Email Outbox] Recoverable send failure, queued for retry', {
      to,
      error: toErrorSummary(error),
    });

    return { sent: false, queued: true };
  }
}

export async function sendVerificationEmailWithRecovery({ to, token }) {
  const url = new URL('/api/v1/auth/verify-email', env.appBaseUrl);
  url.searchParams.set('token', token);

  const { subject, text, html } = buildVerifyEmailTemplate({
    link: url.toString(),
    ttlHours: env.emailVerificationTtlHours,
  });

  return sendEmailWithRecovery({ to, subject, text, html });
}

export async function sendResetPasswordEmailWithRecovery({ to, token }) {
  const url = new URL('/reset-password', env.frontendBaseUrl);
  url.searchParams.set('token', token);

  const { subject, text, html } = buildResetPasswordTemplate({
    link: url.toString(),
    ttlMinutes: env.passwordResetTokenTtlMinutes,
  });

  return sendEmailWithRecovery({ to, subject, text, html });
}
