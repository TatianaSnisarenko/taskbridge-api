import nodemailer from 'nodemailer';
import { URL } from 'node:url';
import { env } from '../config/env.js';
import { buildVerifyEmailTemplate } from '../templates/email/verify-email.js';
import { buildResetPasswordTemplate } from '../templates/email/reset-password.js';

const transporter = nodemailer.createTransport({
  host: env.emailHost,
  port: env.emailPort,
  secure: env.emailSecure,
  auth: {
    user: env.emailAddress,
    pass: env.emailPassword,
  },
});

export async function sendEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: `TeamUp IT <${env.emailAddress}>`,
    to,
    subject,
    text,
    html,
  });
}

export async function sendVerificationEmail({ to, token }) {
  const url = new URL('/api/v1/auth/verify-email', env.appBaseUrl);
  url.searchParams.set('token', token);
  const link = url.toString();

  const { subject, text, html } = buildVerifyEmailTemplate({
    link,
    ttlHours: env.emailVerificationTtlHours,
  });

  return sendEmail({ to, subject, text, html });
}

export async function sendResetPasswordEmail({ to, token }) {
  const url = new URL('/reset-password', env.frontendBaseUrl);
  url.searchParams.set('token', token);
  const link = url.toString();

  const { subject, text, html } = buildResetPasswordTemplate({
    link,
    ttlMinutes: env.passwordResetTokenTtlMinutes,
  });

  return sendEmail({ to, subject, text, html });
}
