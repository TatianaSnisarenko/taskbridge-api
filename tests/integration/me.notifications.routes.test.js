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

describe('me notification routes', () => {
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

  describe('POST /me/notifications/{id}/read', () => {
    test('marks notification as read successfully', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create unread notification
      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
        },
      });

      // Verify it's unread initially
      expect(notif.readAt).toBeNull();

      // Mark as read
      const res = await request(app)
        .post(`/api/v1/me/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', notif.id);
      expect(res.body).toHaveProperty('read_at');

      // Verify read_at is ISO format
      expect(typeof res.body.read_at).toBe('string');
      expect(res.body.read_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Verify notification is actually marked as read in DB
      const updated = await prisma.notification.findUnique({
        where: { id: notif.id },
        select: { readAt: true },
      });

      expect(updated.readAt).not.toBeNull();
    });
  });

  describe('POST /me/notifications/{id}/unread', () => {
    test('marks notification as unread successfully', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
          readAt: new Date('2026-03-15T12:00:00Z'),
        },
      });

      expect(notif.readAt).not.toBeNull();

      const res = await request(app)
        .post(`/api/v1/me/notifications/${notif.id}/unread`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: notif.id,
        read_at: null,
      });

      const updated = await prisma.notification.findUnique({
        where: { id: notif.id },
        select: { readAt: true },
      });

      expect(updated.readAt).toBeNull();
    });

    test('returns 401 when no access token is provided', async () => {
      const res = await request(app)
        .post('/api/v1/me/notifications/550e8400-e29b-41d4-a716-446655440000/unread')
        .set('X-Persona', 'developer');

      expect(res.status).toBe(401);
    });

    test('returns 400 for invalid notification id format', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/notifications/not-a-uuid/unread')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error.details');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });
  });
});
