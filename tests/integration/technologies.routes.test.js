import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('technologies routes', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();

    await prisma.technology.createMany({
      data: [
        {
          slug: 'react',
          name: 'React',
          type: 'FRONTEND',
          popularityScore: 120,
          isActive: true,
        },
        {
          slug: 'redux',
          name: 'Redux',
          type: 'FRONTEND',
          popularityScore: 95,
          isActive: true,
        },
        {
          slug: 'postgresql',
          name: 'PostgreSQL',
          type: 'DATA',
          popularityScore: 110,
          isActive: true,
        },
        {
          slug: 'sentry-react',
          name: 'Sentry React SDK',
          type: 'FRONTEND',
          popularityScore: 70,
          isActive: true,
        },
        {
          slug: 'retool',
          name: 'Retool',
          type: 'OTHER',
          popularityScore: 65,
          isActive: true,
        },
        {
          slug: 'legacy-reactive-lib',
          name: 'Reactive Legacy Lib',
          type: 'FRONTEND',
          popularityScore: 999,
          isActive: false,
        },
      ],
    });
  });

  test('GET /technologies/types returns 200 and list shape', async () => {
    const res = await request(app).get('/api/v1/technologies/types');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});
