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

describe('me routes', () => {
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

  describe('GET /me/tasks', () => {
    test('returns accepted developer tasks and excludes deleted', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const otherDev = await createUser({ developerProfile: { displayName: 'Other' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'TeamUp MVP',
          status: 'ACTIVE',
        },
      });

      const task1 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'IN_PROGRESS',
          publishedAt: new Date('2026-02-10T10:00:00Z'),
          title: 'Task A',
          description: 'Description A',
        },
      });

      const app1 = await prisma.application.create({
        data: {
          taskId: task1.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: task1.id },
        data: { acceptedApplicationId: app1.id },
      });

      const completedAt = new Date('2026-02-12T10:00:00Z');
      const task2 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: null,
          status: 'COMPLETED',
          publishedAt: new Date('2026-02-11T10:00:00Z'),
          completedAt,
          title: 'Task B',
          description: 'Description B',
        },
      });

      const app2 = await prisma.application.create({
        data: {
          taskId: task2.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: task2.id },
        data: { acceptedApplicationId: app2.id },
      });

      const task3 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETION_REQUESTED',
          publishedAt: new Date('2026-02-13T10:00:00Z'),
          title: 'Task C',
          description: 'Description C',
        },
      });

      const app3 = await prisma.application.create({
        data: {
          taskId: task3.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: task3.id },
        data: { acceptedApplicationId: app3.id },
      });

      const taskOther = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Other Task',
          description: 'Other Description',
        },
      });

      const appOther = await prisma.application.create({
        data: {
          taskId: taskOther.id,
          developerUserId: otherDev.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: taskOther.id },
        data: { acceptedApplicationId: appOther.id },
      });

      const taskDeleted = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          publishedAt: new Date('2026-02-15T10:00:00Z'),
          title: 'Deleted Task',
          description: 'Deleted Description',
        },
      });

      const appDeleted = await prisma.application.create({
        data: {
          taskId: taskDeleted.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: taskDeleted.id },
        data: { acceptedApplicationId: appDeleted.id, deletedAt: new Date() },
      });

      const res = await request(app)
        .get('/api/v1/me/tasks?page=1&size=2')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(2);
      expect(res.body.total).toBe(3);
      expect(res.body.items).toHaveLength(2);

      const res2 = await request(app)
        .get('/api/v1/me/tasks?page=2&size=2')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(1);
      expect(res2.body.total).toBe(3);

      const allItems = [...res.body.items, ...res2.body.items];
      const taskIds = allItems.map((item) => item.task_id);
      expect(taskIds).toEqual(expect.arrayContaining([task1.id, task2.id, task3.id]));
      expect(taskIds).not.toContain(taskOther.id);
      expect(taskIds).not.toContain(taskDeleted.id);

      const completedItem = allItems.find((item) => item.task_id === task2.id);
      expect(completedItem).toBeTruthy();
      expect(completedItem).toMatchObject({
        task_id: task2.id,
        status: 'COMPLETED',
        project: null,
        company: {
          user_id: company.id,
          company_name: 'Company',
          verified: false,
          avg_rating: 0,
          reviews_count: 0,
        },
      });
      expect(completedItem.completed_at).toBeDefined();
    });
  });

  describe('GET /me/projects', () => {
    test('developer sees ACTIVE and ARCHIVED projects they worked on', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const otherDev = await createUser({ developerProfile: { displayName: 'Other' } });
      const company = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const activeWorked = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Active Worked',
          shortDescription: 'Active project',
          description: 'Description',
          technologies: ['Node.js'],
          status: 'ACTIVE',
          visibility: 'PUBLIC',
        },
      });

      const archivedWorked = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Archived Worked',
          shortDescription: 'Archived project',
          description: 'Description',
          technologies: ['Node.js'],
          status: 'ARCHIVED',
          visibility: 'PUBLIC',
        },
      });

      const archivedNotWorked = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Archived Not Worked',
          shortDescription: 'Archived no work',
          description: 'Description',
          technologies: ['Node.js'],
          status: 'ARCHIVED',
          visibility: 'PUBLIC',
        },
      });

      const activeTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: activeWorked.id,
          title: 'Active task',
          description: 'Task',
          status: 'COMPLETED',
        },
      });

      await prisma.application.create({
        data: {
          taskId: activeTask.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      const archivedTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: archivedWorked.id,
          title: 'Archived task',
          description: 'Task',
          status: 'COMPLETED',
        },
      });

      await prisma.application.create({
        data: {
          taskId: archivedTask.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      const notWorkedTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: archivedNotWorked.id,
          title: 'Not worked task',
          description: 'Task',
          status: 'COMPLETED',
        },
      });

      await prisma.application.create({
        data: {
          taskId: notWorkedTask.id,
          developerUserId: otherDev.id,
          status: 'ACCEPTED',
        },
      });

      const res = await request(app)
        .get('/api/v1/me/projects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      const titles = res.body.items.map((item) => item.title);
      expect(titles).toEqual(expect.arrayContaining(['Active Worked', 'Archived Worked']));
      expect(titles).not.toContain('Archived Not Worked');
    });
  });
});
