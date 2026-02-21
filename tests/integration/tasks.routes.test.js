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

  test('PUT /tasks/:taskId rejects unauthorized', async () => {
    const res = await request(app)
      .put('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .send(basePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('PUT /tasks/:taskId rejects missing persona header', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERSONA_REQUIRED');
  });

  test('PUT /tasks/:taskId rejects non-company persona', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer')
      .send(basePayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('PUT /tasks/:taskId rejects invalid task ID', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/tasks/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'taskId',
          issue: 'Task id must be a valid UUID',
        }),
      ])
    );
  });

  test('PUT /tasks/:taskId rejects task not found', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PUT /tasks/:taskId rejects non-owner task', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'DRAFT',
        title: 'Owner task',
        description: 'Owner task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('PUT /tasks/:taskId rejects invalid state', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'IN_PROGRESS',
        title: 'In progress task',
        description: 'In progress task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('PUT /tasks/:taskId rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, title: 'AB' });

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

  test('PUT /tasks/:taskId rejects missing project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROJECT_NOT_FOUND');
  });

  test('PUT /tasks/:taskId rejects non-owner project', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const user = await createUser({ companyProfile: { companyName: 'User' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

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

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: project.id });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('PUT /tasks/:taskId updates DRAFT task without project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      updated: true,
      updated_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.updated_at))).toBe(false);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });

    expect(updated).toMatchObject({
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
    expect(updated.applicationDeadline.toISOString().startsWith('2026-02-20')).toBe(true);
  });

  test('PUT /tasks/:taskId updates DRAFT task with project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: user.id,
        title: 'User project',
        shortDescription: 'User project',
        description: 'User project description',
        technologies: ['Node.js'],
        visibility: 'PUBLIC',
      },
    });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ ...basePayload, project_id: project.id });

    expect(res.status).toBe(200);
    expect(res.body.task_id).toEqual(task.id);
    expect(res.body.updated).toBe(true);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });

    expect(updated.projectId).toBe(project.id);
    expect(updated.title).toBe(basePayload.title);
  });

  test('PUT /tasks/:taskId updates PUBLISHED task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'PUBLISHED',
        title: 'Published task',
        description: 'Published task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .put(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(basePayload);

    expect(res.status).toBe(200);
    expect(res.body.task_id).toEqual(task.id);
    expect(res.body.updated).toBe(true);

    const updated = await prisma.task.findUnique({ where: { id: task.id } });

    expect(updated.status).toBe('PUBLISHED');
    expect(updated.title).toBe(basePayload.title);
  });

  test('POST /tasks/:taskId/publish rejects unauthorized', async () => {
    const res = await request(app).post(
      '/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/publish'
    );

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /tasks/:taskId/publish rejects missing persona header', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/publish')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERSONA_REQUIRED');
  });

  test('POST /tasks/:taskId/publish rejects non-company persona', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/publish')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('POST /tasks/:taskId/publish rejects invalid task ID', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/not-a-uuid/publish')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'taskId',
          issue: 'Task id must be a valid UUID',
        }),
      ])
    );
  });

  test('POST /tasks/:taskId/publish rejects task not found', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/publish')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST /tasks/:taskId/publish rejects non-owner task', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'DRAFT',
        title: 'Owner task',
        description: 'Owner task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('POST /tasks/:taskId/publish rejects invalid state (PUBLISHED)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        title: 'Published task',
        description: 'Published task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('POST /tasks/:taskId/publish rejects invalid state (IN_PROGRESS)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'IN_PROGRESS',
        publishedAt: new Date(),
        title: 'In progress task',
        description: 'In progress task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('POST /tasks/:taskId/publish publishes DRAFT task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/publish`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'PUBLISHED',
      published_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.published_at))).toBe(false);

    const published = await prisma.task.findUnique({ where: { id: task.id } });

    expect(published.status).toBe('PUBLISHED');
    expect(published.publishedAt).toBeInstanceOf(Date);
  });

  test('POST /tasks/:taskId/close rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/close');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /tasks/:taskId/close rejects missing persona header', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/close')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERSONA_REQUIRED');
  });

  test('POST /tasks/:taskId/close rejects non-company persona', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/close')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('POST /tasks/:taskId/close rejects invalid task ID', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/not-a-uuid/close')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'taskId',
          issue: 'Task id must be a valid UUID',
        }),
      ])
    );
  });

  test('POST /tasks/:taskId/close rejects task not found', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/close')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('POST /tasks/:taskId/close rejects non-owner task', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'DRAFT',
        title: 'Owner task',
        description: 'Owner task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('POST /tasks/:taskId/close rejects invalid state (IN_PROGRESS)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'IN_PROGRESS',
        publishedAt: new Date(),
        title: 'In progress task',
        description: 'In progress task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('POST /tasks/:taskId/close rejects invalid state (COMPLETED)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'COMPLETED',
        publishedAt: new Date(),
        title: 'Completed task',
        description: 'Completed task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('POST /tasks/:taskId/close rejects invalid state (CLOSED)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'CLOSED',
        closedAt: new Date(),
        publishedAt: new Date(),
        title: 'Closed task',
        description: 'Closed task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('POST /tasks/:taskId/close closes DRAFT task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'CLOSED',
      closed_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.closed_at))).toBe(false);

    const closed = await prisma.task.findUnique({ where: { id: task.id } });

    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  test('POST /tasks/:taskId/close closes PUBLISHED task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        title: 'Published task',
        description: 'Published task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/close`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'CLOSED',
      closed_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.closed_at))).toBe(false);

    const closed = await prisma.task.findUnique({ where: { id: task.id } });

    expect(closed.status).toBe('CLOSED');
    expect(closed.closedAt).toBeInstanceOf(Date);
  });

  test('DELETE /tasks/:taskId rejects unauthorized', async () => {
    const res = await request(app).delete('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('DELETE /tasks/:taskId rejects missing persona header', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PERSONA_REQUIRED');
  });

  test('DELETE /tasks/:taskId rejects non-company persona', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('DELETE /tasks/:taskId rejects invalid task ID', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/tasks/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'taskId',
          issue: 'Task id must be a valid UUID',
        }),
      ])
    );
  });

  test('DELETE /tasks/:taskId rejects task not found', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('DELETE /tasks/:taskId rejects non-owner task', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'DRAFT',
        title: 'Owner task',
        description: 'Owner task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('DELETE /tasks/:taskId rejects invalid state (IN_PROGRESS)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'IN_PROGRESS',
        publishedAt: new Date(),
        title: 'In progress task',
        description: 'In progress task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('DELETE /tasks/:taskId rejects invalid state (COMPLETED)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'COMPLETED',
        publishedAt: new Date(),
        title: 'Completed task',
        description: 'Completed task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATE');
  });

  test('DELETE /tasks/:taskId rejects invalid state (already DELETED)', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DELETED',
        deletedAt: new Date(),
        publishedAt: new Date(),
        title: 'Deleted task',
        description: 'Deleted task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('DELETE /tasks/:taskId deletes DRAFT task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'DRAFT',
        title: 'Draft task',
        description: 'Draft task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'DELETED',
      deleted_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.deleted_at))).toBe(false);

    const deleted = await prisma.task.findUnique({ where: { id: task.id } });

    expect(deleted.status).toBe('DELETED');
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });

  test('DELETE /tasks/:taskId deletes PUBLISHED task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        title: 'Published task',
        description: 'Published task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'DELETED',
      deleted_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.deleted_at))).toBe(false);

    const deleted = await prisma.task.findUnique({ where: { id: task.id } });

    expect(deleted.status).toBe('DELETED');
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });

  test('DELETE /tasks/:taskId deletes CLOSED task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'CLOSED',
        closedAt: new Date(),
        publishedAt: new Date(),
        title: 'Closed task',
        description: 'Closed task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        requiredSkills: ['Node.js'],
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: 'Code',
        requirements: 'Reqs',
        niceToHave: 'Nice',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'DELETED',
      deleted_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.deleted_at))).toBe(false);

    const deleted = await prisma.task.findUnique({ where: { id: task.id } });

    expect(deleted.status).toBe('DELETED');
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });

  describe('GET /tasks/:taskId', () => {
    test('returns public published task details', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      const task = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T13:20:00Z'),
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
          applicationDeadline: new Date('2026-02-20'),
          visibility: 'PUBLIC',
          deliverables: basePayload.deliverables,
          requirements: basePayload.requirements,
          niceToHave: basePayload.nice_to_have,
        },
      });

      const res = await request(app).get(`/api/v1/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        task_id: task.id,
        owner_user_id: owner.id,
        status: 'PUBLISHED',
        title: basePayload.title,
        description: basePayload.description,
        category: basePayload.category,
        type: basePayload.type,
        difficulty: basePayload.difficulty,
        required_skills: basePayload.required_skills,
        estimated_effort_hours: basePayload.estimated_effort_hours,
        expected_duration: basePayload.expected_duration,
        communication_language: basePayload.communication_language,
        timezone_preference: basePayload.timezone_preference,
        application_deadline: '2026-02-20',
        visibility: 'PUBLIC',
        deliverables: basePayload.deliverables,
        requirements: basePayload.requirements,
        nice_to_have: basePayload.nice_to_have,
        deleted_at: null,
        company: {
          user_id: owner.id,
          company_name: 'TeamUp Studio',
          verified: false,
          avg_rating: expect.any(Number),
          reviews_count: expect.any(Number),
        },
      });
      expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);
      expect(Number.isNaN(Date.parse(res.body.published_at))).toBe(false);
    });

    test('rejects invalid taskId', async () => {
      const res = await request(app).get('/api/v1/tasks/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'taskId',
            issue: 'Task id must be a valid UUID',
          }),
        ])
      );
    });

    test('rejects non-public task without auth', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      const task = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          status: 'DRAFT',
          title: 'Draft task',
          description: 'Draft task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get(`/api/v1/tasks/${task.id}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects non-owner access to non-public task', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'Owner' } });
      const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
      const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          status: 'DRAFT',
          title: 'Owner task',
          description: 'Owner task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'UNLISTED',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_OWNER');
    });

    test('returns non-public task details for owner with persona', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          status: 'DRAFT',
          title: 'Draft task',
          description: 'Draft task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'UNLISTED',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.task_id).toBe(task.id);
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.visibility).toBe('UNLISTED');
    });

    test('returns 404 for deleted task', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      const task = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          status: 'DELETED',
          deletedAt: new Date(),
          title: 'Deleted task',
          description: 'Deleted task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get(`/api/v1/tasks/${task.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /tasks', () => {
    test('returns empty catalog initially', async () => {
      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        items: [],
        page: 1,
        size: 20,
        total: 0,
      });
    });

    test('returns only published public tasks in public catalog', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      // Create published public task
      const publishedTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Public published task',
          description: 'Public published task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      // Create draft task (should not appear)
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft task',
          description: 'Draft task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      // Create published unlisted task (should not appear)
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Unlisted task',
          description: 'Unlisted task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'UNLISTED',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].task_id).toBe(publishedTask.id);
      expect(res.body.items[0].title).toBe('Public published task');
      expect(res.body.items[0].status).toBe('PUBLISHED');
    });

    test('filters by search term in title', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Java REST API implementation',
          description: 'Implement REST API',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
          requiredSkills: ['Java'],
          estimatedEffortHours: 8,
          expectedDuration: 'DAYS_8_14',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Frontend React development',
          description: 'Implementing React components',
          category: 'FRONTEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['React'],
          estimatedEffortHours: 6,
          expectedDuration: 'DAYS_8_14',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks?search=REST');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].title).toBe('Java REST API implementation');
    });

    test('filters by category', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Backend task',
          description: 'Backend task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Frontend task',
          description: 'Frontend task',
          category: 'FRONTEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['React'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks?category=BACKEND');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].category).toBe('BACKEND');
    });

    test('filters by difficulty', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Junior task',
          description: 'Junior task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Senior task',
          description: 'Senior task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'SENIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 10,
          expectedDuration: 'DAYS_15_30',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks?difficulty=SENIOR');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].difficulty).toBe('SENIOR');
    });

    test('filters by type', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Paid task',
          description: 'Paid task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Experience task',
          description: 'Experience task',
          category: 'BACKEND',
          type: 'EXPERIENCE',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 3,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks?type=PAID');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].type).toBe('PAID');
    });

    test('filters by required skills', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Java Spring task',
          description: 'Java Spring task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Java', 'Spring'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Node.js task',
          description: 'Node.js task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get('/api/v1/tasks?skill=Java&skill=Spring');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].required_skills).toEqual(expect.arrayContaining(['Java', 'Spring']));
    });

    test('supports pagination', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      for (let i = 0; i < 25; i++) {
        await prisma.task.create({
          data: {
            ownerUserId: company.id,
            status: 'PUBLISHED',
            publishedAt: new Date(),
            title: `Task ${i}`,
            description: 'Task description',
            category: 'BACKEND',
            type: 'PAID',
            difficulty: 'JUNIOR',
            requiredSkills: ['Node.js'],
            estimatedEffortHours: 5,
            expectedDuration: 'DAYS_1_7',
            communicationLanguage: 'EN',
            timezonePreference: 'UTC',
            applicationDeadline: new Date('2026-03-01'),
            visibility: 'PUBLIC',
            deliverables: 'Code',
            requirements: 'Reqs',
            niceToHave: 'Nice',
          },
        });
      }

      const res1 = await request(app).get('/api/v1/tasks?page=1&size=10');

      expect(res1.status).toBe(200);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(10);
      expect(res1.body.total).toBe(25);
      expect(res1.body.items).toHaveLength(10);

      const res2 = await request(app).get('/api/v1/tasks?page=2&size=10');

      expect(res2.status).toBe(200);
      expect(res2.body.page).toBe(2);
      expect(res2.body.items).toHaveLength(10);
    });

    test('owner=true requires authentication', async () => {
      const res = await request(app).get('/api/v1/tasks?owner=true');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('owner=true requires company persona', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/tasks?owner=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('owner=true returns company tasks in all states', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create draft task
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft task',
          description: 'Draft task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      // Create published task
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Published task',
          description: 'Published task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'UNLISTED',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app)
        .get('/api/v1/tasks?owner=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toContainEqual(expect.objectContaining({ status: 'DRAFT' }));
      expect(res.body.items).toContainEqual(expect.objectContaining({ status: 'PUBLISHED' }));
    });

    test('owner=true excludes deleted tasks by default', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create deleted task
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DELETED',
          deletedAt: new Date(),
          title: 'Deleted task',
          description: 'Deleted task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app)
        .get('/api/v1/tasks?owner=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
    });

    test('include_deleted=true includes deleted tasks when owner=true', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create deleted task
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DELETED',
          deletedAt: new Date(),
          title: 'Deleted task',
          description: 'Deleted task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app)
        .get('/api/v1/tasks?owner=true&include_deleted=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].status).toBe('DELETED');
    });
  });

  describe('POST /tasks/:taskId/publish with max_talents', () => {
    test('rejects publish when project reached max_talents limit', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Dev Corp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create project with maxTalents = 1
      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Limited project',
          shortDescription: 'Test',
          description: 'Test project',
          maxTalents: 1,
          publishedTasksCount: 1,
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      // Create task for the project
      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'DRAFT',
          title: 'Add feature',
          description: 'Test task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-15'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('MAX_TALENTS_REACHED');
    });

    test('publishes task when under max_talents limit', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Dev Corp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create project with maxTalents = 3
      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Generous project',
          shortDescription: 'Test',
          description: 'Test project',
          maxTalents: 3,
          publishedTasksCount: 1,
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      // Create task for the project
      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'DRAFT',
          title: 'Add feature',
          description: 'Test task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-15'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.task_id).toBe(task.id);
      expect(res.body.status).toBe('PUBLISHED');

      // Verify counter incremented
      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(updatedProject.publishedTasksCount).toBe(2);
    });

    test('publishes task without project', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Dev Corp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      // Create standalone task (no project)
      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Standalone task',
          description: 'Test task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-15'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.task_id).toBe(task.id);
      expect(res.body.status).toBe('PUBLISHED');
    });
  });

  describe('POST /tasks/:taskId/applications', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .send({ message: 'I can do it this week.' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects missing persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'I can do it this week.' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('rejects non-developer persona', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company')
        .send({ message: 'I can do it this week.' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('rejects invalid payload', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ message: 'Too short' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'message',
            issue: 'Message must be at least 10 characters',
          }),
        ])
      );
    });

    test('returns 404 for missing task', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ message: 'I can do it this week.' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('TASK_NOT_FOUND');
    });

    test('returns 409 for non-published task', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft task',
          description: 'Draft task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ message: 'I can do it this week.' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('TASK_NOT_OPEN');
    });

    test('returns 409 for duplicate application', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Published task',
          description: 'Published task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
          message: 'First application',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ message: 'Second application attempt.' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_APPLIED');
    });

    test('creates application for published task', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Published task',
          description: 'Published task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({
          message: 'I can do it this week.',
          proposed_plan: 'Day1 filters, Day2 tests.',
          availability_note: 'Evenings',
        });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        application_id: expect.any(String),
        task_id: task.id,
        developer_user_id: developer.id,
        status: 'APPLIED',
        created_at: expect.any(String),
      });
      expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

      const application = await prisma.application.findUnique({
        where: { id: res.body.application_id },
      });

      expect(application).toMatchObject({
        taskId: task.id,
        developerUserId: developer.id,
        status: 'APPLIED',
        message: 'I can do it this week.',
        proposedPlan: 'Day1 filters, Day2 tests.',
        availabilityNote: 'Evenings',
      });

      const notification = await prisma.notification.findFirst({
        where: {
          userId: company.id,
          taskId: task.id,
          type: 'APPLICATION_CREATED',
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(notification).toMatchObject({
        userId: company.id,
        actorUserId: developer.id,
        taskId: task.id,
        type: 'APPLICATION_CREATED',
        payload: {
          task_id: task.id,
          application_id: res.body.application_id,
          review_id: null,
        },
      });
    });
  });

  describe('GET /tasks', () => {
    test('filters by project_id', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Test project',
          shortDescription: 'Test project',
          description: 'Test project description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      // Task for project
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Project task',
          description: 'Project task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      // Standalone task
      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Standalone task',
          description: 'Standalone task',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });
    });
  });

  describe('GET /tasks/{taskId}/applications', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get(
        '/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications'
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects non-company persona', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('returns 404 for non-existent task', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const res = await request(app)
        .get('/api/v1/tasks/3fa85f64-5717-4562-b3fc-2c963f66afa6/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not task owner', async () => {
      const company1 = await createUser({ companyProfile: { companyName: 'Company1' } });
      const company2 = await createUser({ companyProfile: { companyName: 'Company2' } });
      const company2Token = buildAccessToken({ userId: company2.id, email: company2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company1.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${company2Token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_OWNER');
    });

    test('rejects invalid page parameter', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications?page=0`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns empty list when task has no applications', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        size: 20,
        total: 0,
      });
    });

    test('returns paginated applications with developer info', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const developer = await createUser({
        developerProfile: {
          displayName: 'Tetiana',
          jobTitle: 'Java Backend Engineer',
          avgRating: 4.7,
          reviewsCount: 12,
        },
      });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const application = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
          message: 'I can do it this week.',
          proposedPlan: 'Day1 filters, Day2 tests.',
          availabilityNote: 'Evenings',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        application_id: application.id,
        status: 'APPLIED',
        message: 'I can do it this week.',
        proposed_plan: 'Day1 filters, Day2 tests.',
        availability_note: 'Evenings',
        developer: {
          user_id: developer.id,
          display_name: 'Tetiana',
          primary_role: 'Java Backend Engineer',
          avg_rating: 4.7,
          reviews_count: 12,
        },
      });
      expect(res.body).toMatchObject({
        page: 1,
        size: 20,
        total: 1,
      });
      expect(res.body.items[0].created_at).toBeDefined();
    });

    test('returns applications ordered by creation date (newest first)', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      const app1 = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: dev1.id,
          status: 'APPLIED',
          createdAt: new Date('2026-02-14T12:00:00Z'),
        },
      });

      const app2 = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: dev2.id,
          status: 'APPLIED',
          createdAt: new Date('2026-02-15T12:00:00Z'),
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].application_id).toBe(app2.id);
      expect(res.body.items[1].application_id).toBe(app1.id);
    });

    test('returns paginated results correctly', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      // Create 25 applications
      for (let i = 0; i < 25; i++) {
        const dev = await createUser({ developerProfile: { displayName: `Dev${i}` } });
        await prisma.application.create({
          data: {
            taskId: task.id,
            developerUserId: dev.id,
            status: 'APPLIED',
          },
        });
      }

      // Get first page (size=10)
      const res1 = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications?page=1&size=10`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(10);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(10);
      expect(res1.body.total).toBe(25);

      // Get second page (size=10)
      const res2 = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications?page=2&size=10`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(10);
      expect(res2.body.page).toBe(2);
      expect(res2.body.total).toBe(25);

      // Different applications
      const page1Ids = new Set(res1.body.items.map((a) => a.application_id));
      const page2Ids = new Set(res2.body.items.map((a) => a.application_id));

      expect([...page1Ids].some((id) => page2Ids.has(id))).toBe(false);
    });

    test('returns applications with null optional fields', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      // Application with no message, proposed_plan, or availability_note
      const application = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/applications`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items[0]).toMatchObject({
        application_id: application.id,
        message: null,
        proposed_plan: null,
        availability_note: null,
      });
    });
  });

  describe('GET /tasks', () => {
    test('filters by project_id', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Project with tasks',
          status: 'ACTIVE',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task in project',
          description: 'Published task description',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          requiredSkills: ['Node.js'],
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Reqs',
          niceToHave: 'Nice',
        },
      });

      const res = await request(app).get(`/api/v1/tasks?project_id=${project.id}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].project.project_id).toBe(project.id);
    });
  });
});
