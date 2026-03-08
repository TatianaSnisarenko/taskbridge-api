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

const originalTaskCreate = prisma.task.create.bind(prisma.task);
const originalTaskUpdate = prisma.task.update.bind(prisma.task);
const originalProjectCreate = prisma.project.create.bind(prisma.project);

const basePayload = {
  project_id: null,
  title: 'Add filtering to tasks catalog',
  description: 'Implement filters + pagination.',
  category: 'BACKEND',
  type: 'EXPERIENCE',
  difficulty: 'JUNIOR',
  estimated_effort_hours: 6,
  expected_duration: 'DAYS_8_14',
  communication_language: 'EN',
  timezone_preference: 'Europe/Any',
  application_deadline: '2026-02-20',
  visibility: 'PUBLIC',
  deliverables: ['PR with code', 'Tests'],
  requirements: ['REST', 'Pagination'],
  nice_to_have: ['OpenAPI'],
};

describe('tasks routes', () => {
  beforeAll(async () => {
    prisma.project.create = (args) => {
      if (Array.isArray(args?.data?.technologies)) {
        // eslint-disable-next-line no-unused-vars
        const { technologies, ...rest } = args.data;
        return originalProjectCreate({ ...args, data: rest });
      }

      return originalProjectCreate(args);
    };

    prisma.task.create = (args) => {
      return originalTaskCreate(args);
    };

    prisma.task.update = (args) => {
      return originalTaskUpdate(args);
    };

    await prisma.$connect();
  });

  afterAll(async () => {
    prisma.project.create = originalProjectCreate;
    prisma.task.create = originalTaskCreate;
    prisma.task.update = originalTaskUpdate;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
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
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: ['Code'],
        requirements: ['Reqs'],
        niceToHave: ['Nice'],
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
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: ['Code'],
        requirements: ['Reqs'],
        niceToHave: ['Nice'],
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
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: ['Code'],
        requirements: ['Reqs'],
        niceToHave: ['Nice'],
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

  test('POST /tasks/:taskId/completion/confirm completes task', async () => {
    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: company.id, email: company.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'COMPLETION_REQUESTED',
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Completion requested task',
        description: 'Completion requested task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-01'),
        visibility: 'PUBLIC',
        deliverables: ['Code'],
        requirements: ['Reqs'],
        niceToHave: ['Nice'],
      },
    });

    const application = await prisma.application.create({
      data: {
        taskId: task.id,
        developerUserId: developer.id,
        status: 'ACCEPTED',
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { acceptedApplicationId: application.id },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/completion/confirm`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'COMPLETED',
      completed_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.completed_at))).toBe(false);

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });

    expect(updatedTask.status).toBe('COMPLETED');
    expect(updatedTask.completedAt).toBeInstanceOf(Date);

    const notification = await prisma.notification.findFirst({
      where: {
        userId: developer.id,
        taskId: task.id,
        type: 'TASK_COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).toMatchObject({
      userId: developer.id,
      actorUserId: company.id,
      taskId: task.id,
      type: 'TASK_COMPLETED',
      payload: {
        task_id: task.id,
        completed_at: res.body.completed_at,
      },
    });
  });
});
