import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetCheckEmailRateLimiters } from '../../src/middleware/rate-limit.middleware.js';
import { resetDatabase } from '../helpers/db.js';
import { buildSignupPayload } from '../helpers/factories.js';

const sendVerificationEmailMock = jest.fn().mockResolvedValue(undefined);

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('auth routes', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    resetCheckEmailRateLimiters();
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

  test('GET /auth/check-email returns in_use=false for available email', async () => {
    const email = 'free@example.com';

    const res = await request(app).get('/api/v1/auth/check-email').query({ email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email,
      in_use: false,
    });
  });

  test('GET /auth/check-email returns in_use=true for existing email', async () => {
    const payload = buildSignupPayload();
    await request(app).post('/api/v1/auth/signup').send(payload);

    const res = await request(app).get('/api/v1/auth/check-email').query({ email: payload.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      email: payload.email,
      in_use: true,
    });
  });

  test('GET /auth/check-email rejects invalid email format', async () => {
    const res = await request(app).get('/api/v1/auth/check-email').query({ email: 'bad-email' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
    });
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'email',
          issue: 'Email format is invalid',
        }),
      ])
    );
  });

  test('GET /auth/check-email returns 429 when per-IP rate limit is exceeded', async () => {
    for (let index = 0; index < 10; index += 1) {
      const email = `free-${index}@example.com`;
      const response = await request(app).get('/api/v1/auth/check-email').query({ email });
      expect(response.status).toBe(200);
    }

    const blocked = await request(app)
      .get('/api/v1/auth/check-email')
      .query({ email: 'blocked@example.com' });

    expect(blocked.status).toBe(429);
    expect(blocked.headers['retry-after']).toBeDefined();
    expect(blocked.body.error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    });
  });
});
