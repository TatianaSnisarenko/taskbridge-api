import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('docs openapi routes', () => {
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

  test('GET /docs/openapi.json returns spec for moderator', async () => {
    const user = await createUser({
      developerProfile: { displayName: 'Moderator User' },
      emailVerified: true,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .get('/api/v1/docs/openapi.json')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openapi: '3.0.0',
      info: {
        title: 'TeamUp IT API',
      },
    });
    expect(res.body.paths).toBeTruthy();
    expect(res.body.components).toBeTruthy();
  });
});
