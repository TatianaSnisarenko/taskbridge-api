import { jest } from '@jest/globals';
import crypto from 'node:crypto';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import {
  buildSignupPayload,
  buildPassword,
  createUser,
  createVerificationToken,
  createRefreshToken,
} from '../helpers/factories.js';
import { buildAccessToken, hashToken } from '../helpers/auth.js';

const sendVerificationEmailMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

function getCookieValue(setCookieHeader, name) {
  const cookie = Array.isArray(setCookieHeader) ? setCookieHeader[0] : setCookieHeader;
  if (!cookie) return null;
  const [pair] = cookie.split(';');
  const [cookieName, value] = pair.split('=');
  if (cookieName !== name) return null;
  return value;
}

describe('auth routes', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
  });

  test('POST /auth/signup creates user and verification token', async () => {
    const payload = buildSignupPayload();

    const res = await request(app).post('/api/v1/auth/signup').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: payload.email,
      hasDeveloperProfile: true,
      hasCompanyProfile: false,
    });
    expect(sendVerificationEmailMock).toHaveBeenCalledWith({
      to: payload.email,
      token: expect.any(String),
    });

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    const token = await prisma.verificationToken.findFirst({
      where: { userId: user.id, type: 'EMAIL_VERIFY' },
    });

    expect(user).toBeTruthy();
    expect(token).toBeTruthy();
  });

  test('POST /auth/signup rejects invalid payload', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ email: 'bad', password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /auth/signup rejects duplicate email', async () => {
    const payload = buildSignupPayload();
    await request(app).post('/api/v1/auth/signup').send(payload);

    const res = await request(app).post('/api/v1/auth/signup').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  test('POST /auth/signup handles invalid JSON', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"email":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  test('POST /auth/login rejects unverified user', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: false, password });

    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  test('POST /auth/login rejects invalid payload', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'bad', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /auth/login rejects wrong password', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'WrongPass1!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('POST /auth/login returns access and refresh token', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();

    const tokens = await prisma.refreshToken.findMany({ where: { userId: user.id } });
    expect(tokens).toHaveLength(1);
  });

  test('POST /auth/refresh rotates refresh token', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email: user.email, password });

    const refreshToken = getCookieValue(loginRes.headers['set-cookie'], 'refresh_token');
    const refreshRes = await agent.post('/api/v1/auth/refresh').send({});

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.access_token).toBeTruthy();

    const oldHash = hashToken(refreshToken);
    const oldRecord = await prisma.refreshToken.findFirst({ where: { tokenHash: oldHash } });
    const active = await prisma.refreshToken.findFirst({
      where: { userId: user.id, revokedAt: null },
    });

    expect(oldRecord.revokedAt).toBeInstanceOf(Date);
    expect(active).toBeTruthy();
  });

  test('POST /auth/refresh rejects missing cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_MISSING');
  });

  test('POST /auth/refresh rejects invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['refresh_token=invalid-token'])
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  test('POST /auth/refresh rejects revoked refresh token', async () => {
    const user = await createUser({ emailVerified: true });
    const { token } = await createRefreshToken({
      userId: user.id,
      revokedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`refresh_token=${token}`])
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('REFRESH_TOKEN_INVALID');
  });

  test('POST /auth/logout revokes refresh token', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const agent = request.agent(app);
    const loginRes = await agent.post('/api/v1/auth/login').send({ email: user.email, password });

    const refreshToken = getCookieValue(loginRes.headers['set-cookie'], 'refresh_token');
    const res = await agent.post('/api/v1/auth/logout').send({});

    expect(res.status).toBe(200);

    const tokenHash = hashToken(refreshToken);
    const record = await prisma.refreshToken.findFirst({ where: { tokenHash } });
    expect(record.revokedAt).toBeInstanceOf(Date);
  });

  test('POST /auth/logout succeeds without cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout').send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('POST /auth/logout is idempotent', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const agent = request.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: user.email, password });

    const first = await agent.post('/api/v1/auth/logout').send({});
    const second = await agent.post('/api/v1/auth/logout').send({});

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  test('POST /auth/password sets password for authenticated user', async () => {
    const oldPassword = buildPassword();
    const user = await createUser({ emailVerified: true, password: oldPassword });
    const token = buildAccessToken({ userId: user.id, email: user.email });
    const newPassword = 'NewStrongPassword123!';

    const res = await request(app)
      .post('/api/v1/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user_id: user.id,
      password_set: true,
    });
    expect(res.body.updated_at).toBeTruthy();

    const oldLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: oldPassword });
    expect(oldLogin.status).toBe(401);
    expect(oldLogin.body.error.code).toBe('INVALID_CREDENTIALS');

    const newLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: newPassword });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.access_token).toBeTruthy();
  });

  test('POST /auth/password rejects invalid payload with field-level details', async () => {
    const user = await createUser({ emailVerified: true });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'password',
        }),
      ])
    );
  });

  test('POST /auth/password rejects unauthorized request', async () => {
    const res = await request(app)
      .post('/api/v1/auth/password')
      .send({ password: 'NewStrongPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('GET /auth/verify-email verifies token', async () => {
    const user = await createUser({ emailVerified: false });
    const { token, record } = await createVerificationToken({ userId: user.id });

    const res = await request(app).get(`/api/v1/auth/verify-email?token=${token}`);

    expect(res.status).toBe(200);

    const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
    const updatedToken = await prisma.verificationToken.findUnique({
      where: { id: record.id },
    });

    expect(updatedUser.emailVerified).toBe(true);
    expect(updatedToken.usedAt).toBeInstanceOf(Date);
  });

  test('GET /auth/verify-email rejects invalid token', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email?token=bad');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMAIL_VERIFICATION_INVALID');
  });

  test('GET /auth/verify-email rejects used token', async () => {
    const user = await createUser({ emailVerified: false });
    const { token } = await createVerificationToken({
      userId: user.id,
      usedAt: new Date(),
    });

    const res = await request(app).get(`/api/v1/auth/verify-email?token=${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMAIL_VERIFICATION_INVALID');
  });

  test('GET /auth/verify-email rejects missing token', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /auth/resend-verification throttles frequent requests', async () => {
    const user = await createUser({ emailVerified: false });
    const now = Date.now();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFY',
        tokenHash: crypto.createHash('sha256').update('token').digest('hex'),
        expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 2 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: user.email });

    expect(res.status).toBe(429);
    expect(res.body.error.code).toBe('EMAIL_VERIFICATION_THROTTLED');
  });

  test('POST /auth/resend-verification sends new token', async () => {
    const user = await createUser({ emailVerified: false });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(sendVerificationEmailMock).toHaveBeenCalled();

    const tokens = await prisma.verificationToken.findMany({ where: { userId: user.id } });
    expect(tokens.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /auth/resend-verification allows after cooldown', async () => {
    const user = await createUser({ emailVerified: false });
    const now = Date.now();
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'EMAIL_VERIFY',
        tokenHash: crypto.createHash('sha256').update('token-old').digest('hex'),
        expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        createdAt: new Date(now - 10 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: user.email });

    expect(res.status).toBe(200);
  });

  test('POST /auth/resend-verification rejects verified user', async () => {
    const user = await createUser({ emailVerified: true });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: user.email });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_VERIFIED');
  });

  test('POST /auth/resend-verification rejects unknown user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'missing@example.com' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('USER_NOT_FOUND');
  });

  test('POST /auth/signup returns 500 when email fails', async () => {
    sendVerificationEmailMock.mockRejectedValueOnce(new Error('SMTP down'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const payload = buildSignupPayload();
    const res = await request(app).post('/api/v1/auth/signup').send(payload);

    expect(res.status).toBe(500);

    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    expect(user).toBeTruthy();

    errorSpy.mockRestore();
  });

  test('POST /auth/forgot-password returns 200 OK for existing verified user', async () => {
    const { sendResetPasswordEmail } = await import('../../src/services/email/index.js');
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(sendResetPasswordEmail).toHaveBeenCalledWith({
      to: user.email,
      token: expect.any(String),
    });

    const resetToken = await prisma.verificationToken.findFirst({
      where: { userId: user.id, type: 'PASSWORD_RESET' },
    });
    expect(resetToken).toBeTruthy();
  });

  test('POST /auth/forgot-password returns 200 OK for non-existent user (no reveal)', async () => {
    const { sendResetPasswordEmail } = await import('../../src/services/email/index.js');
    sendResetPasswordEmail.mockClear();

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  test('POST /auth/forgot-password returns 200 OK for unverified user (no reveal)', async () => {
    const { sendResetPasswordEmail } = await import('../../src/services/email/index.js');
    sendResetPasswordEmail.mockClear();

    const user = await createUser({ emailVerified: false });

    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(sendResetPasswordEmail).not.toHaveBeenCalled();
  });

  test('POST /auth/forgot-password rejects invalid email format', async () => {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toContainEqual({
      field: 'email',
      issue: 'Email format is invalid',
    });
  });

  test('POST /auth/reset-password resets password with valid token', async () => {
    const oldPassword = buildPassword();
    const user = await createUser({ emailVerified: true, password: oldPassword });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const newPassword = 'NewPassword123!';
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, new_password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ password_reset: true });

    // Verify token is marked as used
    const usedToken = await prisma.verificationToken.findFirst({
      where: { tokenHash },
    });
    expect(usedToken.usedAt).toBeTruthy();

    // Verify password was changed
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: newPassword });
    expect(loginRes.status).toBe(200);
  });

  test('POST /auth/reset-password rejects expired token', async () => {
    const user = await createUser({ emailVerified: true });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, new_password: 'NewPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  test('POST /auth/reset-password rejects already used token', async () => {
    const user = await createUser({ emailVerified: true });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: new Date(),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, new_password: 'NewPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  test('POST /auth/reset-password rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalid-token', new_password: 'NewPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
  });

  test('POST /auth/reset-password rejects weak password', async () => {
    const user = await createUser({ emailVerified: true });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, new_password: 'weak' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /auth/reset-password revokes all refresh tokens', async () => {
    const password = buildPassword();
    const user = await createUser({ emailVerified: true, password });

    // Create some refresh tokens
    await createRefreshToken({ userId: user.id });
    await createRefreshToken({ userId: user.id });

    const token = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: 'PASSWORD_RESET',
        tokenHash,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const newPassword = 'NewPassword123!';
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, new_password: newPassword });

    // Verify all refresh tokens are revoked
    const tokens = await prisma.refreshToken.findMany({
      where: { userId: user.id, revokedAt: null },
    });
    expect(tokens).toHaveLength(0);
  });
});
