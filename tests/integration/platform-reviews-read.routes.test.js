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

describe('platform-reviews routes - GET', () => {
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

  describe('GET /platform-reviews', () => {
    test('should return approved reviews for public access', async () => {
      const user1 = await createUser({ developerProfile: { displayName: 'User One' } });
      const user2 = await createUser({ companyProfile: { companyName: 'Company Two' } });

      await prisma.platformReview.createMany({
        data: [
          {
            userId: user1.id,
            rating: 5,
            text: 'Approved review from developer',
            isApproved: true,
          },
          {
            userId: user2.id,
            rating: 4,
            text: 'Approved review from company',
            isApproved: true,
          },
          {
            userId: user1.id,
            rating: 3,
            text: 'Pending review - should not be visible',
            isApproved: false,
          },
        ],
      });

      const res = await request(app).get('/api/v1/platform-reviews');

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(res.body.reviews.every((r) => r.is_approved === true)).toBe(true);
    });

    test('should allow admin to see all reviews', async () => {
      const admin = await createUser({ developerProfile: { displayName: 'Admin User' } });
      await prisma.user.update({
        where: { id: admin.id },
        data: { role: 'ADMIN' },
      });
      const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

      const user = await createUser({ developerProfile: { displayName: 'Regular User' } });

      await prisma.platformReview.createMany({
        data: [
          {
            userId: user.id,
            rating: 5,
            text: 'Approved review',
            isApproved: true,
          },
          {
            userId: user.id,
            rating: 3,
            text: 'Pending review',
            isApproved: false,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ status: 'all' });

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    test('should support pagination', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test User' } });

      const reviews = Array.from({ length: 25 }, (_, i) => ({
        userId: user.id,
        rating: 5,
        text: `Review number ${i + 1} with enough text to pass validation`,
        isApproved: true,
      }));

      await prisma.platformReview.createMany({ data: reviews });

      const res = await request(app)
        .get('/api/v1/platform-reviews')
        .query({ limit: 10, offset: 0 });

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(10);
      expect(res.body.total).toBe(25);
      expect(res.body.limit).toBe(10);
      expect(res.body.offset).toBe(0);
    });

    test('should support sorting by rating', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test User' } });

      await prisma.platformReview.createMany({
        data: [
          { userId: user.id, rating: 3, text: 'Three star review text here', isApproved: true },
          { userId: user.id, rating: 5, text: 'Five star review text here', isApproved: true },
          { userId: user.id, rating: 1, text: 'One star review text here', isApproved: true },
        ],
      });

      const res = await request(app)
        .get('/api/v1/platform-reviews')
        .query({ sort: 'highest_rated' });

      expect(res.status).toBe(200);
      expect(res.body.reviews[0].rating).toBe(5);
      expect(res.body.reviews[2].rating).toBe(1);
    });

    test('should include owner pending review for authenticated owner', async () => {
      const owner = await createUser({ developerProfile: { displayName: 'Owner User' } });
      const ownerToken = buildAccessToken({ userId: owner.id, email: owner.email });
      const other = await createUser({ developerProfile: { displayName: 'Other User' } });

      await prisma.platformReview.createMany({
        data: [
          {
            userId: owner.id,
            rating: 5,
            text: 'Owner pending review text that should be visible to owner',
            isApproved: false,
          },
          {
            userId: other.id,
            rating: 4,
            text: 'Other user pending review text that should stay hidden',
            isApproved: false,
          },
          {
            userId: other.id,
            rating: 5,
            text: 'Approved review visible to everyone',
            isApproved: true,
          },
        ],
      });

      const res = await request(app)
        .get('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.reviews).toHaveLength(2);
      expect(
        res.body.reviews.some((review) => review.text.includes('Owner pending review text'))
      ).toBe(true);
      expect(
        res.body.reviews.some((review) => review.text.includes('Other user pending review text'))
      ).toBe(false);
    });
  });

  describe('GET /platform-reviews/:reviewId', () => {
    test('should return approved review for public', async () => {
      const user = await createUser({ developerProfile: { displayName: 'John Doe' } });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Great platform for developers',
          isApproved: true,
        },
      });

      const res = await request(app).get(`/api/v1/platform-reviews/${review.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        review_id: review.id,
        rating: 5,
        is_approved: true,
      });
    });

    test('should allow owner to view own unapproved review', async () => {
      const user = await createUser({ developerProfile: { displayName: 'John Doe' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'My pending review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .get(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.is_approved).toBe(false);
    });

    test('should allow owner access with lowercase bearer prefix', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Case Test User' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });
      const review = await prisma.platformReview.create({
        data: {
          userId: user.id,
          rating: 5,
          text: 'Pending review for bearer case-insensitive test',
          isApproved: false,
        },
      });

      const res = await request(app)
        .get(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.review_id).toBe(review.id);
    });

    test('should reject access to unapproved review by non-owner', async () => {
      const owner = await createUser({ developerProfile: { displayName: 'Owner' } });
      const other = await createUser({ developerProfile: { displayName: 'Other' } });
      const otherToken = buildAccessToken({ userId: other.id, email: other.email });

      const review = await prisma.platformReview.create({
        data: {
          userId: owner.id,
          rating: 5,
          text: 'Pending review text here',
          isApproved: false,
        },
      });

      const res = await request(app)
        .get(`/api/v1/platform-reviews/${review.id}`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
    });
  });
});
