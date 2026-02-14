import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('me routes', () => {
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

  test('GET /me rejects unauthorized', async () => {
    const res = await request(app).get('/api/v1/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('GET /me rejects invalid token', async () => {
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('GET /me returns profile flags', async () => {
    const user = await createUser({
      developerProfile: { displayName: 'Dev' },
      companyProfile: { companyName: 'Company' },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user_id: user.id,
      email: user.email,
      hasDeveloperProfile: true,
      hasCompanyProfile: true,
    });
  });

  test('GET /me returns 500 on database error', async () => {
    const user = await createUser({
      developerProfile: { displayName: 'Dev' },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const devSpy = jest
      .spyOn(prisma.developerProfile, 'findUnique')
      .mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);

    devSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
