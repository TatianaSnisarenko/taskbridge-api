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

describe('users catalog routes', () => {
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

  test('GET /users returns paginated list for admin with me-like user payload', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });

    const targetDeveloper = await createUser({ developerProfile: { displayName: 'Dev' } });
    await prisma.userOnboardingState.create({
      data: {
        userId: targetDeveloper.id,
        role: 'developer',
        status: 'completed',
        version: 3,
        completedAt: new Date('2026-03-20T09:00:00.000Z'),
      },
    });

    await createUser({ companyProfile: { companyName: 'Company 1' } });
    await createUser({ developerProfile: { displayName: 'Dev 2' } });

    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const res = await request(app)
      .get('/api/v1/users?page=1&size=2')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    expect(res.body.size).toBe(2);
    expect(res.body.total).toBe(4);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({
        user_id: expect.any(String),
        email: expect.any(String),
        roles: expect.any(Array),
        hasDeveloperProfile: expect.any(Boolean),
        hasCompanyProfile: expect.any(Boolean),
        onboarding: {
          developer: expect.objectContaining({
            status: expect.any(String),
            version: expect.any(Number),
          }),
          company: expect.objectContaining({
            status: expect.any(String),
            version: expect.any(Number),
          }),
        },
      })
    );
  });

  test('GET /users allows moderator', async () => {
    const moderator = await createUser({ developerProfile: { displayName: 'Moderator' } });
    await prisma.user.update({
      where: { id: moderator.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });
    await createUser({ companyProfile: { companyName: 'Company 1' } });

    const moderatorToken = buildAccessToken({ userId: moderator.id, email: moderator.email });

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${moderatorToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  test('GET /users rejects regular user', async () => {
    const regularUser = await createUser({ developerProfile: { displayName: 'Regular' } });
    const regularToken = buildAccessToken({ userId: regularUser.id, email: regularUser.email });

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${regularToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('GET /users validates pagination query params', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });
    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const res = await request(app)
      .get('/api/v1/users?page=0&size=101')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('GET /users filters by email search query (partial, case-insensitive)', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });

    await createUser({
      email: 'alice.search@example.com',
      developerProfile: { displayName: 'Alice' },
    });
    await createUser({ developerProfile: { displayName: 'Bob' } });

    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const res = await request(app)
      .get('/api/v1/users?q=alice')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    // At least one result should have 'alice' in the email (case-insensitive)
    const foundAlice = res.body.items.some((item) => item.email.toLowerCase().includes('alice'));
    expect(foundAlice).toBe(true);
  });

  test('GET /users returns empty list when search has no matches', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { roles: ['USER', 'ADMIN'] },
    });
    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const res = await request(app)
      .get('/api/v1/users?q=nonexistentuser')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
