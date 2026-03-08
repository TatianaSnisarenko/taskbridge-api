import jwt from 'jsonwebtoken';
import { signAccessToken, generateRefreshToken } from '../../src/services/token/index.js';
import { env } from '../../src/config/env.js';

describe('token.service', () => {
  test('signAccessToken includes subject and email', () => {
    const token = signAccessToken({ userId: 'u1', email: 'a@example.com' });
    const payload = jwt.verify(token, env.jwtAccessSecret);

    expect(payload.sub).toBe('u1');
    expect(payload.email).toBe('a@example.com');
  });

  test('generateRefreshToken returns token, hash, and expiry', () => {
    const refresh = generateRefreshToken();

    expect(refresh.token).toEqual(expect.any(String));
    expect(refresh.tokenHash).toEqual(expect.any(String));
    expect(refresh.expiresAt).toBeInstanceOf(Date);
  });
});
