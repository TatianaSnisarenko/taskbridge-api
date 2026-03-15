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

describe('me onboarding routes', () => {
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

  describe('onboarding endpoints', () => {
    test('PATCH /me/onboarding stores completed state with version', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .patch('/api/v1/me/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'developer', status: 'completed', version: 2 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        role: 'developer',
        status: 'completed',
        version: 2,
        skipped_at: null,
      });
      expect(res.body.completed_at).toEqual(expect.any(String));

      const meRes = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(200);
      expect(meRes.body.onboarding.developer).toMatchObject({
        status: 'completed',
        version: 2,
      });
    });

    test('PATCH /me/onboarding rejects invalid payload', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .patch('/api/v1/me/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'developer', status: 'not_started', version: 1 });

      expect(res.status).toBe(400);
      expect(res.body?.error?.code).toBe('VALIDATION_ERROR');
    });

    test('PATCH /me/onboarding returns 403 when role profile does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .patch('/api/v1/me/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'company', status: 'completed', version: 1 });

      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('POST /me/onboarding/reset resets previously completed role state', async () => {
      const user = await createUser({ companyProfile: { companyName: 'ACME' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      await request(app)
        .patch('/api/v1/me/onboarding')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'company', status: 'completed', version: 3 });

      const resetRes = await request(app)
        .post('/api/v1/me/onboarding/reset')
        .set('Authorization', `Bearer ${token}`)
        .send({ role: 'company' });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body).toMatchObject({
        role: 'company',
        status: 'not_started',
        version: 3,
        completed_at: null,
        skipped_at: null,
      });
    });
  });

  describe('GET /me/onboarding/check', () => {
    test('returns 403 when role profile does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/onboarding/check?role=company&version=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body?.error?.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('returns should_show=true for user with no stored state', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/onboarding/check?role=developer&version=1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        should_show: true,
        current_status: 'not_started',
        current_version: 1,
      });
    });
  });
});
