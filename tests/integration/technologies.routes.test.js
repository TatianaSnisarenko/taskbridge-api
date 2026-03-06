import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';

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

  test('GET /technologies returns popular technologies when query is absent', async () => {
    const res = await request(app).get('/api/v1/technologies');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(5);
    expect(res.body.items[0].slug).toBe('react');
    expect(res.body.items[1].slug).toBe('postgresql');
    expect(res.body.items.every((item) => item.slug !== 'legacy-reactive-lib')).toBe(true);
  });

  test('GET /technologies/types returns full TechnologyType list', async () => {
    const res = await request(app).get('/api/v1/technologies/types');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      items: [
        'BACKEND',
        'FRONTEND',
        'DEVOPS',
        'QA',
        'DATA',
        'MOBILE',
        'OTHER',
        'FULLSTACK',
        'AI_ML',
        'UI_UX_DESIGN',
        'PRODUCT_MANAGEMENT',
        'BUSINESS_ANALYSIS',
        'CYBERSECURITY',
        'GAME_DEV',
        'EMBEDDED',
        'TECH_WRITING',
      ],
    });
  });

  test('GET /technologies uses popular mode for trimmed query length < 2', async () => {
    const res = await request(app).get('/api/v1/technologies?q= r ');

    expect(res.status).toBe(200);
    expect(res.body.items[0].slug).toBe('react');
    expect(res.body.items[1].slug).toBe('postgresql');
  });

  test('GET /technologies ranks prefix matches before contains when searching', async () => {
    const res = await request(app).get('/api/v1/technologies?q=re&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);

    const slugs = res.body.items.map((item) => item.slug);
    expect(slugs.indexOf('react')).toBeLessThan(slugs.indexOf('sentry-react'));
    expect(slugs.indexOf('redux')).toBeLessThan(slugs.indexOf('sentry-react'));
  });

  test('GET /technologies filters by type', async () => {
    const res = await request(app).get('/api/v1/technologies?type=DATA&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ slug: 'postgresql', type: 'DATA' });
  });

  test('GET /technologies validates query params with field-level errors', async () => {
    const res = await request(app).get('/api/v1/technologies?limit=abc&type=NOT_VALID');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'limit' }),
        expect.objectContaining({ field: 'type' }),
      ])
    );
  });
});
