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

  test('GET /api/v1/timezones returns 200 with items array', async () => {
    const res = await request(app).get('/api/v1/timezones');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  test('GET /api/v1/timezones each item has value and label', async () => {
    const res = await request(app).get('/api/v1/timezones');

    expect(res.status).toBe(200);
    for (const item of res.body.items) {
      expect(typeof item.value).toBe('string');
      expect(typeof item.label).toBe('string');
    }
  });

  test('GET /api/v1/timezones contains Europe/Kyiv', async () => {
    const res = await request(app).get('/api/v1/timezones');

    const kyiv = res.body.items.find((tz) => tz.value === 'Europe/Kyiv');
    expect(kyiv).toBeDefined();
    expect(kyiv.label).toBe('(UTC+02:00) Europe/Kyiv');
  });

  test('GET /api/v1/timezones does not require authentication', async () => {
    // Endpoint is public - no auth header needed
    const res = await request(app).get('/api/v1/timezones');
    expect(res.status).toBe(200);
  });

  test('GET /api/v1/timezones supports autocomplete by name', async () => {
    const res = await request(app).get('/api/v1/timezones').query({ q: 'kyiv' });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.some((tz) => tz.value === 'Europe/Kyiv')).toBe(true);
  });

  test('GET /api/v1/timezones supports autocomplete by UTC offset', async () => {
    const res = await request(app).get('/api/v1/timezones').query({ q: '+2' });

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((tz) => tz.label.startsWith('(UTC+02:'))).toBe(true);
  });

  test('GET /api/v1/timezones supports grouping by offset', async () => {
    const fullRes = await request(app).get('/api/v1/timezones');
    const groupedRes = await request(app).get('/api/v1/timezones').query({ groupByOffset: true });

    expect(fullRes.status).toBe(200);
    expect(groupedRes.status).toBe(200);
    expect(groupedRes.body.items.length).toBeLessThan(fullRes.body.items.length);
  });

  test('GET /api/v1/timezones applies limit', async () => {
    const res = await request(app).get('/api/v1/timezones').query({ q: 'asia', limit: 3 });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(3);
  });

  test('GET /api/v1/timezones returns 400 for invalid limit', async () => {
    const res = await request(app).get('/api/v1/timezones').query({ limit: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error.details');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.some((item) => item.field === 'limit')).toBe(true);
  });
});
