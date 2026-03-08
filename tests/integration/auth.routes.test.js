import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
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
});
