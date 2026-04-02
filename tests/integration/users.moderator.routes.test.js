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

describe('users moderator routes', () => {
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

  test('PATCH /users/:userId/moderator allows admin to grant moderator role', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });
    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const targetUser = await createUser({ developerProfile: { displayName: 'Target' } });

    const res = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/moderator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: true });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(targetUser.id);
    expect(res.body.moderator_enabled).toBe(true);
    expect(res.body.roles).toContain('MODERATOR');

    const notification = await prisma.notification.findFirst({
      where: {
        userId: targetUser.id,
        actorUserId: admin.id,
        type: 'MODERATOR_ROLE_GRANTED',
      },
    });

    expect(notification).toBeTruthy();
    expect(notification.payload).toEqual(
      expect.objectContaining({
        moderator_enabled: true,
      })
    );
  });

  test('PATCH /users/:userId/moderator allows admin to revoke moderator role', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });
    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const targetUser = await createUser({ developerProfile: { displayName: 'Target' } });
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });

    const res = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/moderator`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(targetUser.id);
    expect(res.body.moderator_enabled).toBe(false);
    expect(res.body.roles).not.toContain('MODERATOR');
    expect(res.body.roles).toContain('USER');

    const notification = await prisma.notification.findFirst({
      where: {
        userId: targetUser.id,
        actorUserId: admin.id,
        type: 'MODERATOR_ROLE_REVOKED',
      },
    });

    expect(notification).toBeTruthy();
    expect(notification.payload).toEqual(
      expect.objectContaining({
        moderator_enabled: false,
      })
    );
  });

  test('PATCH /users/:userId/moderator rejects non-admin user', async () => {
    const regularUser = await createUser({ developerProfile: { displayName: 'Regular' } });
    const regularToken = buildAccessToken({ userId: regularUser.id, email: regularUser.email });

    const targetUser = await createUser({ developerProfile: { displayName: 'Target' } });

    const res = await request(app)
      .patch(`/api/v1/users/${targetUser.id}/moderator`)
      .set('Authorization', `Bearer ${regularToken}`)
      .send({ enabled: true });

    expect(res.status).toBe(403);
  });
});
