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

describe('platform-reviews routes - PATCH & DELETE', () => {
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

  describe('PATCH /platform-reviews/:reviewId', () => {
    test('should allow owner to update unapproved review', async () => {
      const user = await createUser({ developerProfile: { displayName: 'John Doe' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 4,
          text: 'Original review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          rating: 5,
          text: 'Updated review text here now',
        });

      expect(res.status).toBe(200);
      expect(res.body.rating).toBe(5);
      expect(res.body.text).toBe('Updated review text here now');
    });

    test('should not allow owner to approve own review', async () => {
      const user = await createUser({ developerProfile: { displayName: 'John Doe' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Review text here for testing',
          isApproved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ is_approved: true });

      expect(res.status).toBe(403);
    });

    test('should allow admin to update any review', async () => {
      const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: ['USER', 'ADMIN'] },
      });
      const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

      const user = await createUser({ developerProfile: { displayName: 'User' } });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 4,
          text: 'User review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rating: 5,
          is_approved: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.rating).toBe(5);
      expect(res.body.is_approved).toBe(true);
    });
  });

  describe('PATCH /platform-reviews/:reviewId/approve', () => {
    test('should allow admin to approve review', async () => {
      const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: ['USER', 'ADMIN'] },
      });
      const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

      const user = await createUser({ developerProfile: { displayName: 'User' } });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Pending review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/platform-reviews/${review.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.is_approved).toBe(true);
    });

    test('should reject non-admin approval attempt', async () => {
      const user = await createUser({ developerProfile: { displayName: 'User' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .patch(`/api/v1/platform-reviews/${review.id}/approve`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /platform-reviews/:reviewId', () => {
    test('should allow admin to delete review', async () => {
      const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
      await prisma.user.update({
        where: { id: admin.id },
        data: { roles: ['USER', 'ADMIN'] },
      });
      const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

      const user = await createUser({ developerProfile: { displayName: 'User' } });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 1,
          text: 'Inappropriate review text',
          isApproved: false,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);

      const deleted = await prisma.platformReview.findUnique({
        where: { id: review.id },
      });
      expect(deleted).toBeNull();
    });

    test('should reject non-admin delete attempt', async () => {
      const user = await createUser({ developerProfile: { displayName: 'User' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .delete(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });
});
