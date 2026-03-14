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
});
