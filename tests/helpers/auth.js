import crypto from 'node:crypto';
import { signAccessToken } from '../../src/services/token/index.js';

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function buildAccessToken({ userId, email }) {
  return signAccessToken({ userId, email });
}
