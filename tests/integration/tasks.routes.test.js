import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

const basePayload = {
  project_id: null,
  title: 'Add filtering to tasks catalog',
  description: 'Implement filters + pagination.',
  category: 'BACKEND',
  type: 'EXPERIENCE',
  difficulty: 'JUNIOR',
  required_skills: ['Java', 'Spring'],
  estimated_effort_hours: 6,
  expected_duration: 'DAYS_8_14',
  communication_language: 'EN',
  timezone_preference: 'Europe/Any',
  application_deadline: '2026-02-20',
  visibility: 'PUBLIC',
  deliverables: 'PR with code + tests',
  requirements: 'REST + pagination',
  nice_to_have: 'OpenAPI',
};

describe('tasks routes', () => {
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

  test('POST /tasks rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/tasks').send(basePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /tasks rejects missing persona header', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERSONA_REQUIRED');
  });

  test('POST /tasks rejects non-company persona', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer')
      .send(basePayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('POST /tasks rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, title: 'A' });

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

  test('POST /tasks rejects missing project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('POST /tasks rejects non-owner project', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: 'Owner project',
        shortDescription: 'Owner project',
        description: 'Owner project description',
        technologies: ['Node.js'],
        visibility: 'PUBLIC',
      },
    });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: project.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('POST /tasks creates task draft without project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      task_id: expect.any(String),
      status: 'DRAFT',
      created_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

    const task = await prisma.task.findUnique({ where: { id: res.body.task_id } });

    expect(task).toMatchObject({
      ownerUserId: user.id,
      projectId: null,
      status: 'DRAFT',
      title: basePayload.title,
      description: basePayload.description,
      category: basePayload.category,
      type: basePayload.type,
      difficulty: basePayload.difficulty,
      requiredSkills: basePayload.required_skills,
      estimatedEffortHours: basePayload.estimated_effort_hours,
      expectedDuration: basePayload.expected_duration,
      communicationLanguage: basePayload.communication_language,
      timezonePreference: basePayload.timezone_preference,
      visibility: basePayload.visibility,
      deliverables: basePayload.deliverables,
      requirements: basePayload.requirements,
      niceToHave: basePayload.nice_to_have,
    });
    expect(task.applicationDeadline.toISOString().startsWith('2026-02-20')).toBe(true);
  });

  test('POST /tasks creates task draft for project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: user.id,
        title: 'Task project',
        shortDescription: 'Task project',
        description: 'Task project description',
        technologies: ['Node.js'],
        visibility: 'PUBLIC',
      },
    });

    const res = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: project.id });

    expect(res.status).toBe(201);
    expect(res.body.task_id).toEqual(expect.any(String));

    const task = await prisma.task.findUnique({ where: { id: res.body.task_id } });

    expect(task.projectId).toBe(project.id);
    expect(task.ownerUserId).toBe(user.id);
  });
});
