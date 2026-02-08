import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signAccessToken({ userId, email }) {
  return jwt.sign({ email }, env.jwtAccessSecret, {
    subject: userId,
    expiresIn: env.accessTokenTtlSeconds,
  });
}

export function generateRefreshToken() {
  const token = crypto.randomBytes(64).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt };
}
