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

describe('timezones routes', () => {
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

  test('GET /api/v1/timezones each item has value and label', async () => {
    const res = await request(app).get('/api/v1/timezones');

    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(typeof item.value).toBe('string');
      expect(typeof item.label).toBe('string');
    }
  });

  test('GET /api/v1/timezones supports autocomplete by name', async () => {
    const res = await request(app).get('/api/v1/timezones').query({ q: 'kyiv' });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.some((tz) => tz.value === 'Europe/Kyiv')).toBe(true);
  });
});
