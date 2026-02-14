import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

const projectPayload = {
  title: 'TeamUp MVP',
  short_description: 'Build MVP for marketplace',
  description: 'Longer description for the marketplace project',
  technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
  visibility: 'PUBLIC',
  status: 'ACTIVE',
  max_talents: 3,
};

describe('projects routes', () => {
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

  test('POST /projects rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/projects').send(projectPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /projects rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer invalid')
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('POST /projects rejects missing company persona', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('POST /projects rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ title: 'A', short_description: 'short', description: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          issue: 'Title must be at least 3 characters',
        }),
      ])
    );
  });

  test('POST /projects creates project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      project_id: expect.any(String),
      created_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

    const project = await prisma.project.findUnique({ where: { id: res.body.project_id } });

    expect(project).toMatchObject({
      ownerUserId: user.id,
      title: projectPayload.title,
      shortDescription: projectPayload.short_description,
      description: projectPayload.description,
      technologies: projectPayload.technologies,
      visibility: projectPayload.visibility,
      status: projectPayload.status,
      maxTalents: projectPayload.max_talents,
    });
  });
});
