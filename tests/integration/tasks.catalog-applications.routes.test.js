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

const originalProjectCreate = prisma.project.create.bind(prisma.project);

const basePayload = {
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

describe('tasks routes - catalog and applications', () => {
  beforeAll(async () => {
    prisma.project.create = (args) => {
      if (Array.isArray(args?.data?.technologies)) {
        // eslint-disable-next-line no-unused-vars
        const { technologies, ...rest } = args.data;
        return originalProjectCreate({ ...args, data: rest });
      }

      return originalProjectCreate(args);
    };

    await prisma.$connect();
  });

  afterAll(async () => {
    prisma.project.create = originalProjectCreate;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
  });

  describe('GET /tasks/:taskId', () => {
    test('returns public published task details', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });

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

      await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
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
        applications_count: 1,
        can_apply: false,
        is_owner: false,
        is_accepted_developer: false,
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
  });

  describe('GET /tasks', () => {
    test('returns only published public tasks in public catalog', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

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
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          deadline: new Date('2026-08-20'),
          visibility: 'PUBLIC',
          deliverables: ['Code'],
          requirements: ['Reqs'],
          niceToHave: ['Nice'],
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: company.id,
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
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'UNLISTED',
          deliverables: ['Code'],
          requirements: ['Reqs'],
          niceToHave: ['Nice'],
        },
      });

      const res = await request(app).get('/api/v1/tasks');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].task_id).toBe(publishedTask.id);
      expect(res.body.items[0].title).toBe('Public published task');
      expect(res.body.items[0].status).toBe('PUBLISHED');
      expect(res.body.items[0].deadline).toBe('2026-08-20');
    });
  });

  describe('GET /tasks/:taskId candidate endpoints', () => {
    test('GET /tasks/:taskId/recommended-developers returns 200 and items shape', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Recommended developers task',
          description: 'Task to check recommended developers route wiring',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-20'),
          visibility: 'PUBLIC',
          deliverables: ['Code'],
          requirements: ['Tests'],
          niceToHave: ['Docs'],
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/recommended-developers`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });

    test('GET /tasks/:taskId/candidates returns 200 and items shape', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date(),
          title: 'Candidates task',
          description: 'Task to check candidates route wiring',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'JUNIOR',
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-20'),
          visibility: 'PUBLIC',
          deliverables: ['Code'],
          requirements: ['Tests'],
          niceToHave: ['Docs'],
        },
      });

      const res = await request(app)
        .get(`/api/v1/tasks/${task.id}/candidates`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(typeof res.body.total).toBe('number');
    });
  });

  describe('POST /tasks/:taskId/publish with max_talents', () => {
    test('publishes task when under max_talents limit', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Dev Corp' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

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
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-15'),
          visibility: 'PUBLIC',
          deliverables: ['Code'],
          requirements: ['Tests'],
          niceToHave: ['Docs'],
        },
      });

      const res = await request(app)
        .post(`/api/v1/tasks/${task.id}/publish`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.task_id).toBe(task.id);
      expect(res.body.status).toBe('PUBLISHED');

      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(updatedProject.publishedTasksCount).toBe(2);
    });
  });

  describe('POST /tasks/:taskId/applications', () => {
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
          estimatedEffortHours: 5,
          expectedDuration: 'DAYS_1_7',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-01'),
          visibility: 'PUBLIC',
          deliverables: ['Code'],
          requirements: ['Tests'],
          niceToHave: ['Docs'],
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
});
