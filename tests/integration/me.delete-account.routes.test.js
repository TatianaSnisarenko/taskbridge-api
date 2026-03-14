import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createRefreshToken, createUser, createVerificationToken } from '../helpers/factories.js';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('me delete-account route', () => {
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

  test('returns 401 without bearer token', async () => {
    const res = await request(app).delete('/api/v1/me');

    expect(res.status).toBe(401);
    expect(res.body?.error?.code).toBe('AUTH_REQUIRED');
  });

  test('soft-deletes account, anonymizes profiles, revokes tokens, anonymizes email', async () => {
    const user = await createUser({
      emailVerified: true,
      developerProfile: {
        displayName: 'Dev',
        bio: 'Developer bio',
        location: 'Kyiv',
        portfolioUrl: 'https://portfolio.example.com',
        linkedinUrl: 'https://linkedin.com/in/dev',
        preferredTaskCategories: ['BACKEND'],
      },
      companyProfile: {
        companyName: 'Dev Company',
        description: 'Company description',
        country: 'Ukraine',
        contactEmail: 'contact@company.example',
        websiteUrl: 'https://company.example',
        links: { linkedin: 'https://linkedin.com/company/dev-company' },
        verified: true,
      },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    await createRefreshToken({ userId: user.id });
    await createVerificationToken({ userId: user.id });

    const res = await request(app).delete('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user_id: user.id,
      deleted_at: expect.any(String),
    });

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        email: true,
        emailVerified: true,
        deletedAt: true,
        developerProfile: {
          select: {
            displayName: true,
            bio: true,
            location: true,
            portfolioUrl: true,
            linkedinUrl: true,
            preferredTaskCategories: true,
          },
        },
        companyProfile: {
          select: {
            companyName: true,
            description: true,
            country: true,
            contactEmail: true,
            websiteUrl: true,
            links: true,
            verified: true,
          },
        },
      },
    });

    expect(updatedUser.deletedAt).toBeTruthy();
    expect(updatedUser.emailVerified).toBe(false);
    expect(updatedUser.email).toMatch(/^deleted\+.+@deleted\.local$/);
    expect(updatedUser.developerProfile).toMatchObject({
      displayName: 'Anonymous Developer',
      bio: '',
      location: null,
      portfolioUrl: null,
      linkedinUrl: null,
      preferredTaskCategories: [],
    });
    expect(updatedUser.companyProfile).toMatchObject({
      companyName: 'Anonymous Company',
      description: '',
      country: null,
      contactEmail: null,
      websiteUrl: null,
      links: {},
      verified: false,
    });

    const activeRefreshTokens = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(activeRefreshTokens).toBe(0);

    const unusedVerificationTokens = await prisma.verificationToken.count({
      where: { userId: user.id, usedAt: null },
    });
    expect(unusedVerificationTokens).toBe(0);

    const meRes = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
    expect(meRes.body?.error?.code).toBe('INVALID_TOKEN');
  });
});
