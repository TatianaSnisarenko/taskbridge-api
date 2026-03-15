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

describe('platform-reviews routes - POST', () => {
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

  describe('POST /platform-reviews', () => {
    test('should create platform review for authenticated developer', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'John Doe' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const res = await request(app)
        .post('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${devToken}`)
        .send({
          rating: 5,
          text: 'Excellent platform for finding great projects!',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        review_id: expect.any(String),
        user_id: developer.id,
        author_name: 'John Doe',
        rating: 5,
        text: 'Excellent platform for finding great projects!',
        is_approved: false,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });
    });

    test('should create platform review for authenticated company', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TechCorp' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const res = await request(app)
        .post('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${companyToken}`)
        .send({
          rating: 4,
          text: 'Great place to find talented developers.',
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        author_name: 'TechCorp',
        rating: 4,
      });
    });

    test('should reject unauthenticated request', async () => {
      const res = await request(app).post('/api/v1/platform-reviews').send({
        rating: 5,
        text: 'This should not be created',
      });

      expect(res.status).toBe(401);
    });

    test('should enforce cooldown period', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test User' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create first review
      await request(app)
        .post('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rating: 5,
          text: 'First review with enough characters',
        });

      // Try to create second review immediately
      const res = await request(app)
        .post('/api/v1/platform-reviews')
        .set('Authorization', `Bearer ${token}`)
        .send({
          rating: 4,
          text: 'Second review with enough characters',
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('REVIEW_COOLDOWN');
    });
  });
});
