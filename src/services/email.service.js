import nodemailer from 'nodemailer';
import { URL } from 'node:url';
import { env } from '../config/env.js';

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
    from: env.emailAddress,
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

  const subject = 'Verify your email';
  const text = `Verify your email: ${link}`;
  const html = `<p>Verify your email:</p><p><a href="${link}">Confirm email</a></p>`;

  return sendEmail({ to, subject, text, html });
}
