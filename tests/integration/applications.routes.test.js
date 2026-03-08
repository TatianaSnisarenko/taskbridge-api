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

describe('applications routes', () => {
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

  describe('POST /applications/{applicationId}/accept', () => {
    test('accepts application and updates task status', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Description',
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

      const application = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
        },
      });

      const res = await request(app)
        .post(`/api/v1/applications/${application.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        task_id: task.id,
        accepted_application_id: application.id,
        task_status: 'IN_PROGRESS',
        accepted_developer_user_id: developer.id,
      });

      // Verify in database
      const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
      expect(updatedTask.status).toBe('IN_PROGRESS');
      expect(updatedTask.acceptedApplicationId).toBe(application.id);

      const updatedApp = await prisma.application.findUnique({ where: { id: application.id } });
      expect(updatedApp.status).toBe('ACCEPTED');
    });

    test('creates APPLICATION_ACCEPTED notification for selected developer', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Description',
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

      const application = await prisma.application.create({
        data: { taskId: task.id, developerUserId: developer.id, status: 'APPLIED' },
      });

      await request(app)
        .post(`/api/v1/applications/${application.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      const notification = await prisma.notification.findFirst({
        where: {
          userId: developer.id,
          type: 'APPLICATION_ACCEPTED',
        },
      });

      expect(notification).toBeDefined();
      expect(notification.actorUserId).toBe(company.id);
      expect(notification.taskId).toBe(task.id);
      expect(notification.payload.task_id).toBe(task.id);
      expect(notification.payload.application_id).toBe(application.id);
    });

    test('creates chat thread when application is accepted', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Description',
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

      const application = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'APPLIED',
        },
      });

      const res = await request(app)
        .post(`/api/v1/applications/${application.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.thread_id).toBeDefined();
      expect(typeof res.body.thread_id).toBe('string');

      // Verify thread was created in database
      const thread = await prisma.chatThread.findUnique({
        where: { taskId: task.id },
      });

      expect(thread).toBeDefined();
      expect(thread.id).toBe(res.body.thread_id);
      expect(thread.companyUserId).toBe(company.id);
      expect(thread.developerUserId).toBe(developer.id);
      expect(thread.lastMessageAt).toBeNull();
    });
  });
});
