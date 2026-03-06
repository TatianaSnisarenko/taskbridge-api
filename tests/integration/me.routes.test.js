import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

jest.unstable_mockModule('../../src/services/email.service.js', () => ({
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
      if (args?.data?.requiredSkills) {
        // eslint-disable-next-line no-unused-vars
        const { requiredSkills, ...rest } = args.data;
        return originalTaskCreate({ ...args, data: rest });
      }

      return originalTaskCreate(args);
    };

    prisma.task.update = (args) => {
      if (args?.data?.requiredSkills) {
        // eslint-disable-next-line no-unused-vars
        const { requiredSkills, ...rest } = args.data;
        return originalTaskUpdate({ ...args, data: rest });
      }

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

  test('GET /me rejects unauthorized', async () => {
    const res = await request(app).get('/api/v1/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('GET /me rejects invalid token', async () => {
    const res = await request(app).get('/api/v1/me').set('Authorization', 'Bearer invalid');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('GET /me returns profile flags', async () => {
    const user = await createUser({
      developerProfile: { displayName: 'Dev' },
      companyProfile: { companyName: 'Company' },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      user_id: user.id,
      email: user.email,
      hasDeveloperProfile: true,
      hasCompanyProfile: true,
    });
  });

  test('GET /me returns 500 on database error', async () => {
    const user = await createUser({
      developerProfile: { displayName: 'Dev' },
    });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const devSpy = jest
      .spyOn(prisma.developerProfile, 'findUnique')
      .mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);

    devSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe('GET /me/applications', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get('/api/v1/me/applications');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('rejects missing X-Persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('rejects non-developer persona', async () => {
      const user = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('rejects if developer profile does not exist', async () => {
      const user = await createUser();
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('rejects invalid page parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications?page=0')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
          }),
        ])
      );
    });

    test('rejects invalid size parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications?size=150')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'size',
          }),
        ])
      );
    });

    test('returns empty list when developer has no applications', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        size: 20,
        total: 0,
      });
    });

    test('returns paginated applications with task and company info', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'TeamUp MVP',
          status: 'ACTIVE',
        },
      });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Add filtering',
          description: 'Implement filtering functionality',
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
          message: 'I can implement this filtering feature.',
        },
      });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        application_id: application.id,
        status: 'APPLIED',
        task: {
          task_id: task.id,
          title: 'Add filtering',
          status: 'PUBLISHED',
          project: {
            project_id: project.id,
            title: 'TeamUp MVP',
          },
        },
        company: {
          user_id: company.id,
          company_name: 'TeamUp Studio',
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
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create two tasks
      const task1 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task 1',
          description: 'Task 1 description',
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

      const task2 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-15T10:00:00Z'),
          title: 'Task 2',
          description: 'Task 2 description',
          category: 'FRONTEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
          requiredSkills: ['React'],
          estimatedEffortHours: 8,
          expectedDuration: 'DAYS_8_14',
          communicationLanguage: 'EN',
          timezonePreference: 'UTC',
          applicationDeadline: new Date('2026-03-05'),
          visibility: 'PUBLIC',
          deliverables: 'Code',
          requirements: 'Tests',
          niceToHave: 'Docs',
        },
      });

      // Create applications in specific order
      const app1 = await prisma.application.create({
        data: {
          taskId: task1.id,
          developerUserId: developer.id,
          status: 'APPLIED',
          createdAt: new Date('2026-02-14T12:00:00Z'),
        },
      });

      const app2 = await prisma.application.create({
        data: {
          taskId: task2.id,
          developerUserId: developer.id,
          status: 'APPLIED',
          createdAt: new Date('2026-02-15T12:00:00Z'),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.items[0].application_id).toBe(app2.id);
      expect(res.body.items[1].application_id).toBe(app1.id);
    });

    test('returns paginated results correctly', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create 25 tasks and applications
      const tasks = [];
      const applications = [];
      for (let i = 0; i < 25; i++) {
        const task = await prisma.task.create({
          data: {
            ownerUserId: company.id,
            status: 'PUBLISHED',
            publishedAt: new Date('2026-02-14T10:00:00Z'),
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
            requirements: 'Tests',
            niceToHave: 'Docs',
          },
        });
        tasks.push(task);

        const app = await prisma.application.create({
          data: {
            taskId: task.id,
            developerUserId: developer.id,
            status: 'APPLIED',
          },
        });
        applications.push(app);
      }

      // Get first page (size=10)
      const res1 = await request(app)
        .get('/api/v1/me/applications?page=1&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(10);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(10);
      expect(res1.body.total).toBe(25);

      // Get second page (size=10)
      const res2 = await request(app)
        .get('/api/v1/me/applications?page=2&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(10);
      expect(res2.body.page).toBe(2);
      expect(res2.body.size).toBe(10);
      expect(res2.body.total).toBe(25);

      // Get third page (size=10, should have 5 items)
      const res3 = await request(app)
        .get('/api/v1/me/applications?page=3&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res3.status).toBe(200);
      expect(res3.body.items).toHaveLength(5);
      expect(res3.body.page).toBe(3);
      expect(res3.body.size).toBe(10);
      expect(res3.body.total).toBe(25);

      // Different applications should be returned for each page
      const page1Ids = new Set(res1.body.items.map((a) => a.application_id));
      const page2Ids = new Set(res2.body.items.map((a) => a.application_id));
      const page3Ids = new Set(res3.body.items.map((a) => a.application_id));

      expect([...page1Ids].some((id) => page2Ids.has(id))).toBe(false);
      expect([...page1Ids].some((id) => page3Ids.has(id))).toBe(false);
      expect([...page2Ids].some((id) => page3Ids.has(id))).toBe(false);
    });

    test('returns applications for task with null project', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create task without project
      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: null,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Standalone Task',
          description: 'Task without project',
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
        },
      });

      const res = await request(app)
        .get('/api/v1/me/applications')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        application_id: application.id,
        task: {
          task_id: task.id,
          title: 'Standalone Task',
          status: 'PUBLISHED',
          project: null,
        },
      });
    });
  });

  describe('GET /me/tasks', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get('/api/v1/me/tasks');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app).get('/api/v1/me/tasks').set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('rejects missing X-Persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/tasks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('rejects non-developer persona', async () => {
      const user = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/tasks')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('rejects invalid status parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/tasks?status=INVALID')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
          }),
        ])
      );
    });

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

    test('filters by status when provided', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const taskInProgress = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          publishedAt: new Date('2026-02-10T10:00:00Z'),
          title: 'In Progress',
          description: 'Description',
        },
      });

      const appInProgress = await prisma.application.create({
        data: {
          taskId: taskInProgress.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: taskInProgress.id },
        data: { acceptedApplicationId: appInProgress.id },
      });

      const taskCompleted = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          publishedAt: new Date('2026-02-11T10:00:00Z'),
          completedAt: new Date('2026-02-12T10:00:00Z'),
          title: 'Completed',
          description: 'Description',
        },
      });

      const appCompleted = await prisma.application.create({
        data: {
          taskId: taskCompleted.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
        },
      });

      await prisma.task.update({
        where: { id: taskCompleted.id },
        data: { acceptedApplicationId: appCompleted.id },
      });

      const res = await request(app)
        .get('/api/v1/me/tasks?status=COMPLETED')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        task_id: taskCompleted.id,
        status: 'COMPLETED',
      });
    });
  });

  describe('GET /me/projects', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get('/api/v1/me/projects');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects missing X-Persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/projects')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

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

    test('rejects non-developer persona', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const res = await request(app)
        .get('/api/v1/me/projects')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });
  });

  describe('GET /me/notifications', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get('/api/v1/me/notifications');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('rejects invalid page parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/notifications?page=0')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'page',
          }),
        ])
      );
    });

    test('rejects invalid size parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/notifications?size=150')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'size',
          }),
        ])
      );
    });

    test('rejects invalid unread_only parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/notifications?unread_only=maybe')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'unread_only',
          }),
        ])
      );
    });

    test('returns empty list when user has no notifications', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        size: 20,
        total: 0,
        unread_total: 0,
      });
    });

    test('returns paginated notifications', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create multiple notifications
      const notif1 = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
          createdAt: new Date('2026-02-14T10:00:00Z'),
        },
      });

      const notif2 = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
          createdAt: new Date('2026-02-14T11:00:00Z'),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(20);
      expect(res.body.total).toBe(2);
      expect(res.body.unread_total).toBe(2);

      // Verify notifications are in reverse chronological order (most recent first)
      expect(res.body.items[0].id).toBe(notif2.id);
      expect(res.body.items[1].id).toBe(notif1.id);

      // Verify notification structure
      expect(res.body.items[0]).toMatchObject({
        id: notif2.id,
        type: 'APPLICATION_REJECTED',
        actor_user_id: actor.id,
        project_id: null,
        task_id: null,
        thread_id: null,
        payload: { application_id: 'test-id-2' },
        read_at: null,
      });
    });

    test('filters unread notifications when unread_only=true', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create one unread and one read notification
      const unreadNotif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
          readAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications?unread_only=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(unreadNotif.id);
      expect(res.body.total).toBe(1);
      // unread_total should still count all unread notifications (1)
      expect(res.body.unread_total).toBe(1);
    });

    test('unread_total is correct regardless of filtering', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create 3 unread and 2 read notifications (all relevant to developer persona)
      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'COMPLETION_REQUESTED',
          payload: { task_id: 'test-id-3' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-4' },
          readAt: new Date(),
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'COMPLETION_REQUESTED',
          payload: { task_id: 'test-id-5' },
          readAt: new Date(),
        },
      });

      // Get all notifications
      const resAll = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(resAll.status).toBe(200);
      expect(resAll.body.total).toBe(5);
      expect(resAll.body.unread_total).toBe(3);

      // Get only unread notifications
      const resUnread = await request(app)
        .get('/api/v1/me/notifications?unread_only=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(resUnread.status).toBe(200);
      expect(resUnread.body.total).toBe(3);
      expect(resUnread.body.unread_total).toBe(3);
    });

    test('respects pagination parameters', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await prisma.notification.create({
          data: {
            userId: user.id,
            actorUserId: actor.id,
            type: 'APPLICATION_ACCEPTED',
            payload: { application_id: `test-id-${i}` },
          },
        });
      }

      // Get first page with size 2
      const res1 = await request(app)
        .get('/api/v1/me/notifications?page=1&size=2')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(2);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(2);
      expect(res1.body.total).toBe(5);

      // Get second page with size 2
      const res2 = await request(app)
        .get('/api/v1/me/notifications?page=2&size=2')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(2);
      expect(res2.body.page).toBe(2);
      expect(res2.body.total).toBe(5);

      // Ensure different notifications are returned
      const ids1 = res1.body.items.map((n) => n.id);
      const ids2 = res2.body.items.map((n) => n.id);
      expect(ids1).not.toEqual(ids2);
    });

    test('returns only notifications for current user', async () => {
      const user1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const user2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token1 = buildAccessToken({ userId: user1.id, email: user1.email });

      // Create notifications for both users
      await prisma.notification.create({
        data: {
          userId: user1.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user2.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
        },
      });

      // User1 should only see their notification
      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({
        type: 'APPLICATION_ACCEPTED',
        actor_user_id: actor.id,
      });
    });

    test('notification fields match response contract', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items[0]).toMatchObject({
        id: notif.id,
        type: 'APPLICATION_ACCEPTED',
        actor_user_id: actor.id,
        project_id: null,
        task_id: null,
        thread_id: null,
        payload: { application_id: 'test-id' },
        read_at: null,
      });

      // Verify created_at is ISO string
      expect(typeof res.body.items[0].created_at).toBe('string');
      expect(res.body.items[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe('POST /me/notifications/{id}/read', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).post('/api/v1/me/notifications/test-id/read');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/me/notifications/test-id/read')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('returns 404 if notification does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('Notification not found');
    });

    test('returns 404 if notification belongs to another user', async () => {
      const user1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const user2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token1 = buildAccessToken({ userId: user1.id, email: user1.email });

      // Create notification for user2
      const notif = await prisma.notification.create({
        data: {
          userId: user2.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
        },
      });

      // Try to mark it as read as user1
      const res = await request(app)
        .post(`/api/v1/me/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('marks notification as read successfully', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create unread notification
      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
        },
      });

      // Verify it's unread initially
      expect(notif.readAt).toBeNull();

      // Mark as read
      const res = await request(app)
        .post(`/api/v1/me/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', notif.id);
      expect(res.body).toHaveProperty('read_at');

      // Verify read_at is ISO format
      expect(typeof res.body.read_at).toBe('string');
      expect(res.body.read_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      // Verify notification is actually marked as read in DB
      const updated = await prisma.notification.findUnique({
        where: { id: notif.id },
        select: { readAt: true },
      });

      expect(updated.readAt).not.toBeNull();
    });

    test('can mark already-read notification as read again (idempotent)', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create notification and mark it as read
      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
          readAt: new Date('2026-02-14T10:00:00Z'),
        },
      });

      const firstReadAt = notif.readAt;

      // Mark as read again
      const res = await request(app)
        .post(`/api/v1/me/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', notif.id);
      expect(res.body).toHaveProperty('read_at');

      // Verify the new read_at is after (or equal to) the original
      const newReadAt = new Date(res.body.read_at);
      expect(newReadAt >= firstReadAt).toBe(true);
    });

    test('reduces unread_total when notification is marked as read', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create first notification with specific timestamp
      const notif1 = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
          createdAt: new Date('2026-02-14T10:00:00Z'),
        },
      });

      // Create second notification with later timestamp
      const notif2 = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
          createdAt: new Date('2026-02-14T10:00:01Z'),
        },
      });

      // Check unread_total before
      let notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(2);
      expect(notificationsRes.body.total).toBe(2);

      // Mark first notification as read
      const markRes = await request(app)
        .post(`/api/v1/me/notifications/${notif1.id}/read`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);

      // Check unread_total after
      notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(1);
      expect(notificationsRes.body.total).toBe(2); // Both still in list

      // Find the response items by ID to check read_at status
      const item1 = notificationsRes.body.items.find((n) => n.id === notif1.id);
      const item2 = notificationsRes.body.items.find((n) => n.id === notif2.id);

      expect(item1.read_at).not.toBeNull(); // Marked one is read
      expect(item2.read_at).toBeNull(); // Unmarked one is still unread
    });
  });

  describe('POST /me/notifications/read-all', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).post('/api/v1/me/notifications/read-all');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('marks all notifications as read when user has none', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.updated).toBe(true);
      expect(res.body).toHaveProperty('read_at');
      expect(typeof res.body.read_at).toBe('string');
      expect(res.body.read_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    test('marks all unread notifications as read', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create 3 unread notifications (all relevant to developer persona)
      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
          createdAt: new Date('2026-02-14T10:00:00Z'),
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'COMPLETION_REQUESTED',
          payload: { task_id: 'test-id-2' },
          createdAt: new Date('2026-02-14T10:00:01Z'),
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-3' },
          createdAt: new Date('2026-02-14T10:00:02Z'),
        },
      });

      // Verify all are unread
      let notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(3);
      expect(notificationsRes.body.total).toBe(3);

      // Mark all as read
      const markRes = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);
      expect(markRes.body.updated).toBe(true);

      // Verify all are now marked as read
      notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(0);
      expect(notificationsRes.body.total).toBe(3);
      notificationsRes.body.items.forEach((item) => {
        expect(item.read_at).not.toBeNull();
      });
    });

    test('marks only unread notifications as read', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create some read notifications and some unread (all relevant to developer persona)
      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
          readAt: new Date('2026-02-14T09:00:00Z'),
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'COMPLETION_REQUESTED',
          payload: { task_id: 'test-id-2' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-3' },
        },
      });

      // Verify initial state
      let notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(2);
      expect(notificationsRes.body.total).toBe(3);

      // Mark all as read
      const markRes = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);
      expect(markRes.body.updated).toBe(true);

      // Verify all are now marked as read
      notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(0);
      expect(notificationsRes.body.total).toBe(3);

      // Verify all items have read_at set
      notificationsRes.body.items.forEach((item) => {
        expect(item.read_at).not.toBeNull();
      });
    });

    test('is idempotent - calling twice does not cause errors', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      // Create an unread notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id' },
        },
      });

      // First call
      let markRes = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);
      expect(markRes.body.updated).toBe(true);

      // Second call - should still succeed
      markRes = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);
      expect(markRes.body.updated).toBe(true);

      // Verify all are still read
      const notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(0);
    });

    test('only marks notifications for current user', async () => {
      const user1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const user2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const actor = await createUser({ companyProfile: { companyName: 'Company' } });
      const token1 = buildAccessToken({ userId: user1.id, email: user1.email });
      const token2 = buildAccessToken({ userId: user2.id, email: user2.email });

      // Create unread notifications for both users
      await prisma.notification.create({
        data: {
          userId: user1.id,
          actorUserId: actor.id,
          type: 'APPLICATION_ACCEPTED',
          payload: { application_id: 'test-id-1' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user2.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
          payload: { application_id: 'test-id-2' },
        },
      });

      // Mark all as read for user1
      const markRes = await request(app)
        .post('/api/v1/me/notifications/read-all')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Persona', 'developer');

      expect(markRes.status).toBe(200);

      // Verify user1 has no unread
      let notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(0);

      // Verify user2 still has unread
      notificationsRes = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Persona', 'developer');

      expect(notificationsRes.body.unread_total).toBe(1);
    });
  });

  describe('GET /me/chat/threads', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get('/api/v1/me/chat/threads');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('returns 400 on invalid page parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads?page=0')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on invalid size parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads?size=101')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns empty list when no threads exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        size: 20,
        total: 0,
      });
    });

    test('returns only threads for tasks with IN_PROGRESS or COMPLETED status', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create task with IN_PROGRESS status
      const inProgressTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'In Progress Task',
          description: 'Description',
        },
      });

      // Create thread for IN_PROGRESS task
      const inProgressThread = await prisma.chatThread.create({
        data: {
          taskId: inProgressTask.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create task with DRAFT status (should not appear)
      const draftTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft Task',
          description: 'Description',
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: draftTask.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create task with COMPLETED status
      const completedTask = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          title: 'Completed Task',
          description: 'Description',
          completedAt: new Date(),
        },
      });

      const completedThread = await prisma.chatThread.create({
        data: {
          taskId: completedTask.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
      const threadIds = res.body.items.map((t) => t.thread_id);
      expect(threadIds).toContain(inProgressThread.id);
      expect(threadIds).toContain(completedThread.id);
    });

    test('returns only threads where user is a participant', async () => {
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev1Token = buildAccessToken({ userId: dev1.id, email: dev1.email });

      // Create thread with dev1
      const task1 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task 1',
          description: 'Description',
        },
      });

      const thread1 = await prisma.chatThread.create({
        data: {
          taskId: task1.id,
          companyUserId: company.id,
          developerUserId: dev1.id,
        },
      });

      // Create thread with dev2 (dev1 should not see this)
      const task2 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task 2',
          description: 'Description',
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: task2.id,
          companyUserId: company.id,
          developerUserId: dev2.id,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${dev1Token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].thread_id).toBe(thread1.id);
    });

    test('returns correct other_participant info for developer', async () => {
      const developer = await createUser({
        developerProfile: {
          displayName: 'John Dev',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
      const company = await createUser({
        companyProfile: {
          companyName: 'Acme Inc',
          logoUrl: 'https://example.com/logo.jpg',
        },
      });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items[0].other_participant).toMatchObject({
        user_id: developer.id,
        display_name: 'John Dev',
        company_name: null,
        avatar_url: 'https://example.com/avatar.jpg',
      });
    });

    test('returns last message info correctly', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const messageTime = new Date('2026-02-14T14:30:00Z');
      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Great! Looking forward to your implementation.',
          sentAt: messageTime,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items[0].last_message).toMatchObject({
        id: message.id,
        text: 'Great! Looking forward to your implementation.',
        sender_user_id: company.id,
        sender_persona: 'company',
        sent_at: messageTime.toISOString(),
      });
    });

    test('returns null for last_message when thread has no messages', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items[0].last_message).toBeNull();
    });

    test('calculates unread_count correctly', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create 3 messages
      const now = new Date();
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 1',
          sentAt: new Date(now.getTime() - 10000),
        },
      });

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 2',
          sentAt: new Date(now.getTime() - 5000),
        },
      });

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 3',
          sentAt: now,
        },
      });

      // Mark one message as read (at time between first and second message)
      const readAt = new Date(now.getTime() - 7000);
      await prisma.chatThreadRead.create({
        data: {
          threadId: thread.id,
          userId: developer.id,
          lastReadAt: readAt,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      // 2 messages are after the read time
      expect(res.body.items[0].unread_count).toBe(2);
    });

    test('filters threads by search term (case-insensitive)', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create tasks with different titles
      const task1 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'React Dashboard Component',
          description: 'Description',
        },
      });

      const thread1 = await prisma.chatThread.create({
        data: {
          taskId: task1.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const task2 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Mobile App Development',
          description: 'Description',
        },
      });

      await prisma.chatThread.create({
        data: {
          taskId: task2.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Search for "react" (case-insensitive)
      const res = await request(app)
        .get('/api/v1/me/chat/threads?search=react')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].thread_id).toBe(thread1.id);
      expect(res.body.items[0].task.title).toBe('React Dashboard Component');
    });

    test('returns paginated results correctly', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create 25 tasks and threads
      const threads = [];
      for (let i = 0; i < 25; i++) {
        const task = await prisma.task.create({
          data: {
            ownerUserId: company.id,
            status: 'IN_PROGRESS',
            title: `Task ${i + 1}`,
            description: 'Description',
          },
        });

        const thread = await prisma.chatThread.create({
          data: {
            taskId: task.id,
            companyUserId: company.id,
            developerUserId: developer.id,
            createdAt: new Date(Date.now() - i * 1000), // Each one slightly older
          },
        });

        threads.push(thread);
      }

      // Get first page with size 10
      const res1 = await request(app)
        .get('/api/v1/me/chat/threads?page=1&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(10);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(10);
      expect(res1.body.total).toBe(25);

      // Get second page
      const res2 = await request(app)
        .get('/api/v1/me/chat/threads?page=2&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(10);
      expect(res2.body.page).toBe(2);

      // Get third page with remaining items
      const res3 = await request(app)
        .get('/api/v1/me/chat/threads?page=3&size=10')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res3.status).toBe(200);
      expect(res3.body.items).toHaveLength(5);
      expect(res3.body.page).toBe(3);

      // Verify no duplicates
      const allIds = [
        ...res1.body.items.map((t) => t.thread_id),
        ...res2.body.items.map((t) => t.thread_id),
        ...res3.body.items.map((t) => t.thread_id),
      ];
      expect(new Set(allIds).size).toBe(25);
    });

    test('sorts threads by last_message_at DESC (newest first)', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      // Create two tasks with threads
      const oldTime = new Date('2026-02-10T10:00:00Z');
      const newTime = new Date('2026-02-14T10:00:00Z');

      const task1 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Older Task',
          description: 'Description',
        },
      });

      const thread1 = await prisma.chatThread.create({
        data: {
          taskId: task1.id,
          companyUserId: company.id,
          developerUserId: developer.id,
          createdAt: oldTime,
          lastMessageAt: oldTime,
        },
      });

      const task2 = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Newer Task',
          description: 'Description',
        },
      });

      const thread2 = await prisma.chatThread.create({
        data: {
          taskId: task2.id,
          companyUserId: company.id,
          developerUserId: developer.id,
          createdAt: newTime,
          lastMessageAt: newTime,
        },
      });

      const res = await request(app)
        .get('/api/v1/me/chat/threads')
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      // Newer thread should be first
      expect(res.body.items[0].thread_id).toBe(thread2.id);
      expect(res.body.items[1].thread_id).toBe(thread1.id);
    });
  });

  describe('GET /me/chat/threads/{threadId}', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get(
        '/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6'
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('returns 400 on invalid threadId format', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/invalid-id')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 404 when thread does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not a participant', async () => {
      const user1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const user2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const user2Token = buildAccessToken({ userId: user2.id, email: user2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: user1.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when task status is DRAFT', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 404 when associated task is deleted', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Delete the task
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns thread details for developer participant', async () => {
      const developer = await createUser({
        developerProfile: {
          displayName: 'John Dev',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
      const company = await createUser({
        companyProfile: {
          companyName: 'Acme Inc',
          logoUrl: 'https://example.com/logo.jpg',
        },
      });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'React Dashboard',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        task: {
          task_id: task.id,
          title: 'React Dashboard',
          status: 'IN_PROGRESS',
        },
        other_participant: {
          user_id: company.id,
          display_name: 'Acme Inc',
          company_name: 'Acme Inc',
          avatar_url: 'https://example.com/logo.jpg',
        },
        unread_count: 0,
      });
      expect(res.body.created_at).toBeDefined();
    });

    test('returns thread details for company participant', async () => {
      const developer = await createUser({
        developerProfile: {
          displayName: 'John Dev',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      });
      const company = await createUser({
        companyProfile: {
          companyName: 'Acme Inc',
          logoUrl: 'https://example.com/logo.jpg',
        },
      });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Node.js API',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        task: {
          task_id: task.id,
          title: 'Node.js API',
          status: 'IN_PROGRESS',
        },
        other_participant: {
          user_id: developer.id,
          display_name: 'John Dev',
          company_name: null,
          avatar_url: 'https://example.com/avatar.jpg',
        },
        unread_count: 0,
      });
      expect(res.body.created_at).toBeDefined();
    });

    test('returns correct last_message when messages exist', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const messageTime = new Date('2026-02-14T14:30:00Z');
      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'This is an important message',
          sentAt: messageTime,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.last_message).toMatchObject({
        id: message.id,
        text: 'This is an important message',
        sender_user_id: company.id,
        sender_persona: 'company',
        sent_at: messageTime.toISOString(),
      });
    });

    test('returns null for last_message when thread has no messages', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.last_message).toBeNull();
    });

    test('calculates unread_count correctly for developer', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create 3 messages
      const now = new Date();
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 1',
          sentAt: new Date(now.getTime() - 10000),
        },
      });

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 2',
          sentAt: new Date(now.getTime() - 5000),
        },
      });

      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message 3',
          sentAt: now,
        },
      });

      // Mark some messages as read
      const readAt = new Date(now.getTime() - 7000);
      await prisma.chatThreadRead.create({
        data: {
          threadId: thread.id,
          userId: developer.id,
          lastReadAt: readAt,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      // 2 messages are after the read time
      expect(res.body.unread_count).toBe(2);
    });

    test('allows access to COMPLETED tasks', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          title: 'Completed Task',
          description: 'Description',
          completedAt: new Date(),
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.task.status).toBe('COMPLETED');
    });
  });

  describe('GET /me/chat/threads/{threadId}/messages', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).get(
        '/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/messages'
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/messages')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('returns 400 on invalid threadId format', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/invalid-id/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on invalid page parameter', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages?page=0')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on invalid size parameter (exceeds max)', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages?size=51')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 404 when thread does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not a participant', async () => {
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev2Token = buildAccessToken({ userId: dev2.id, email: dev2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: dev1.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${dev2Token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when task status is DRAFT', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 404 when associated task is deleted', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Delete the task
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns empty list when thread has no messages', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: [],
        page: 1,
        size: 50,
        total: 0,
      });
    });

    test('returns messages in chronological order (ASC by sent_at)', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create messages in non-chronological order
      const msg1Time = new Date('2026-02-14T10:00:00Z');
      const msg2Time = new Date('2026-02-14T10:05:00Z');
      const msg3Time = new Date('2026-02-14T10:10:00Z');

      const msg3 = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Third message',
          sentAt: msg3Time,
        },
      });

      const msg1 = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'First message',
          sentAt: msg1Time,
        },
      });

      const msg2 = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: developer.id,
          senderPersona: 'developer',
          text: 'Second message',
          sentAt: msg2Time,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(3);
      // Verify chronological order
      expect(res.body.items[0].id).toBe(msg1.id);
      expect(res.body.items[1].id).toBe(msg2.id);
      expect(res.body.items[2].id).toBe(msg3.id);
    });

    test('includes message details in correct format', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const messageTime = new Date('2026-02-14T14:30:00Z');
      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Important update',
          sentAt: messageTime,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toMatchObject({
        id: message.id,
        sender_user_id: company.id,
        sender_persona: 'company',
        text: 'Important update',
        sent_at: messageTime.toISOString(),
      });
      expect(res.body.items[0].read_at).toBeDefined();
    });

    test('calculates read_at correctly for unread messages', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create messages at different times
      const now = new Date();
      const oldMsg = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Old message',
          sentAt: new Date(now.getTime() - 10000),
        },
      });

      const newMsg = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'New message',
          sentAt: new Date(now.getTime() + 10000),
        },
      });

      // Set read timestamp in the middle
      const readAt = new Date(now.getTime() - 5000);
      await prisma.chatThreadRead.create({
        data: {
          threadId: thread.id,
          userId: developer.id,
          lastReadAt: readAt,
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      // Old message was read
      const oldMsgResult = res.body.items.find((m) => m.id === oldMsg.id);
      expect(oldMsgResult?.read_at).toBe(readAt.toISOString());
      // New message is unread
      const newMsgResult = res.body.items.find((m) => m.id === newMsg.id);
      expect(newMsgResult?.read_at).toBeNull();
    });

    test('respects pagination parameters', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create 30 messages
      for (let i = 0; i < 30; i++) {
        await prisma.chatMessage.create({
          data: {
            threadId: thread.id,
            senderUserId: company.id,
            senderPersona: 'company',
            text: `Message ${i + 1}`,
            sentAt: new Date(Date.now() + i * 1000),
          },
        });
      }

      // Get first page with size 10
      const res1 = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages?page=1&size=10`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(10);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(10);
      expect(res1.body.total).toBe(30);

      // Get second page
      const res2 = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages?page=2&size=10`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(10);
      expect(res2.body.page).toBe(2);

      // Get third page with remaining items
      const res3 = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages?page=3&size=10`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res3.status).toBe(200);
      expect(res3.body.items).toHaveLength(10);
      expect(res3.body.page).toBe(3);

      // Verify no duplicates across pages
      const allIds = [
        ...res1.body.items.map((m) => m.id),
        ...res2.body.items.map((m) => m.id),
        ...res3.body.items.map((m) => m.id),
      ];
      expect(new Set(allIds).size).toBe(30);
    });

    test('allows access to COMPLETED tasks', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          title: 'Completed Task',
          description: 'Description',
          completedAt: new Date(),
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Final message',
          sentAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(message.id);
    });

    test('returns messages for company participant', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const message = await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: developer.id,
          senderPersona: 'developer',
          text: 'Developer response',
          sentAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].id).toBe(message.id);
      expect(res.body.items[0].sender_persona).toBe('developer');
    });

    test('uses default pagination values', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Create one message
      await prisma.chatMessage.create({
        data: {
          threadId: thread.id,
          senderUserId: company.id,
          senderPersona: 'company',
          text: 'Message',
          sentAt: new Date(),
        },
      });

      // Call without pagination parameters
      const res = await request(app)
        .get(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(50);
      expect(res.body.total).toBe(1);
    });
  });

  describe('POST /me/chat/threads/{threadId}/messages', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/messages')
        .send({ text: 'Hello' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/messages')
        .set('Authorization', 'Bearer invalid')
        .send({ text: 'Hello' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('rejects missing X-Persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('returns 400 on invalid threadId format', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/invalid-id/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on missing text', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on empty text', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ text: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on text exceeding max length', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });
      const longText = 'a'.repeat(2001);

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ text: longText });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 on non-string text', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ text: 123 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 404 when thread does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/messages')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not the developer in this thread', async () => {
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev2Token = buildAccessToken({ userId: dev2.id, email: dev2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: dev1.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${dev2Token}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when user is not the company in this thread', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company1 = await createUser({ companyProfile: { companyName: 'Company1' } });
      const company2 = await createUser({ companyProfile: { companyName: 'Company2' } });
      const company2Token = buildAccessToken({ userId: company2.id, email: company2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company1.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company1.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${company2Token}`)
        .set('X-Persona', 'company')
        .send({ text: 'Hello' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when task status is DRAFT', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 404 when associated task is deleted', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Delete the task
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('creates message successfully for developer', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello from developer!' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        thread_id: thread.id,
        sender_user_id: developer.id,
        sender_persona: 'developer',
        text: 'Hello from developer!',
        sent_at: expect.any(String),
        read_at: null,
      });

      // Verify message was created in database
      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
      });
      expect(message).toBeTruthy();
      expect(message.text).toBe('Hello from developer!');
      expect(message.senderUserId).toBe(developer.id);
      expect(message.senderPersona).toBe('developer');
    });

    test('creates message successfully for company', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .send({ text: 'Hello from company!' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: expect.any(String),
        thread_id: thread.id,
        sender_user_id: company.id,
        sender_persona: 'company',
        text: 'Hello from company!',
        sent_at: expect.any(String),
        read_at: null,
      });

      // Verify message was created in database
      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
      });
      expect(message).toBeTruthy();
      expect(message.text).toBe('Hello from company!');
      expect(message.senderUserId).toBe(company.id);
      expect(message.senderPersona).toBe('company');
    });

    test('creates notification for other participant when developer sends message', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello!' });

      expect(res.status).toBe(201);

      // Verify notification was created for company
      const notification = await prisma.notification.findFirst({
        where: {
          userId: company.id,
          type: 'CHAT_MESSAGE',
        },
      });

      expect(notification).toBeTruthy();
      expect(notification.actorUserId).toBe(developer.id);
      expect(notification.taskId).toBe(task.id);
      expect(notification.payload).toMatchObject({
        thread_id: thread.id,
        task_id: task.id,
      });
    });

    test('creates notification for other participant when company sends message', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .send({ text: 'Hello!' });

      expect(res.status).toBe(201);

      // Verify notification was created for developer
      const notification = await prisma.notification.findFirst({
        where: {
          userId: developer.id,
          type: 'CHAT_MESSAGE',
        },
      });

      expect(notification).toBeTruthy();
      expect(notification.actorUserId).toBe(company.id);
      expect(notification.taskId).toBe(task.id);
      expect(notification.payload).toMatchObject({
        thread_id: thread.id,
        task_id: task.id,
      });
    });

    test('updates thread lastMessageAt timestamp', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Initial thread should have null lastMessageAt
      expect(thread.lastMessageAt).toBeNull();

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Hello!' });

      expect(res.status).toBe(201);

      // Verify thread lastMessageAt was updated
      const updatedThread = await prisma.chatThread.findUnique({
        where: { id: thread.id },
      });

      expect(updatedThread.lastMessageAt).toBeTruthy();
      expect(updatedThread.lastMessageAt.toISOString()).toBe(res.body.sent_at);
    });

    test('allows messaging in COMPLETED tasks', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          title: 'Completed Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: 'Can still chat after completion!' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Can still chat after completion!');
    });

    test('trims whitespace from text', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/messages`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer')
        .send({ text: '   Hello with spaces   ' });

      expect(res.status).toBe(201);
      expect(res.body.text).toBe('Hello with spaces');

      // Verify trimmed text was saved
      const message = await prisma.chatMessage.findFirst({
        where: { threadId: thread.id },
      });
      expect(message.text).toBe('Hello with spaces');
    });
  });

  describe('POST /me/chat/threads/{threadId}/read', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).post(
        '/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/read'
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects invalid token', async () => {
      const res = await request(app)
        .post('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/read')
        .set('Authorization', 'Bearer invalid');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    test('rejects missing X-Persona header', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/123e4567-e89b-12d3-a456-426614174000/read')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('returns 400 on invalid threadId format', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/invalid-id/read')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 404 when thread does not exist', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/me/chat/threads/3fa85f64-5717-4562-b3fc-2c963f66afa6/read')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not the developer in this thread', async () => {
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev2Token = buildAccessToken({ userId: dev2.id, email: dev2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: dev1.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${dev2Token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when user is not the company in this thread', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company1 = await createUser({ companyProfile: { companyName: 'Company1' } });
      const company2 = await createUser({ companyProfile: { companyName: 'Company2' } });
      const company2Token = buildAccessToken({ userId: company2.id, email: company2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company1.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company1.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${company2Token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 403 when task status is DRAFT', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Draft Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    test('returns 404 when associated task is deleted', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Delete the task
      await prisma.task.update({
        where: { id: task.id },
        data: { deletedAt: new Date() },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('marks thread as read successfully for developer', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        read_at: expect.any(String),
      });

      // Verify ChatThreadRead record was created
      const threadRead = await prisma.chatThreadRead.findUnique({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: developer.id,
          },
        },
      });

      expect(threadRead).toBeTruthy();
      expect(threadRead.lastReadAt.toISOString()).toBe(res.body.read_at);
    });

    test('marks thread as read successfully for company', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const companyToken = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        read_at: expect.any(String),
      });

      // Verify ChatThreadRead record was created
      const threadRead = await prisma.chatThreadRead.findUnique({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: company.id,
          },
        },
      });

      expect(threadRead).toBeTruthy();
      expect(threadRead.lastReadAt.toISOString()).toBe(res.body.read_at);
    });

    test('updates existing read timestamp when called multiple times', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // First call
      const res1 = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res1.status).toBe(200);
      const firstReadAt = res1.body.read_at;

      // Second call (may have same or later timestamp)
      const res2 = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res2.status).toBe(200);
      const secondReadAt = res2.body.read_at;

      // Second timestamp should be later
      expect(new Date(secondReadAt).getTime()).toBeGreaterThanOrEqual(
        new Date(firstReadAt).getTime()
      );

      // Verify only one record exists
      const threadReads = await prisma.chatThreadRead.findMany({
        where: {
          threadId: thread.id,
          userId: developer.id,
        },
      });

      expect(threadReads).toHaveLength(1);
      expect(threadReads[0].lastReadAt.toISOString()).toBe(secondReadAt);
    });

    test('allows marking thread as read in COMPLETED tasks', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'COMPLETED',
          title: 'Completed Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        thread_id: thread.id,
        read_at: expect.any(String),
      });
    });

    test('does not affect other user read status', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'IN_PROGRESS',
          title: 'Task',
          description: 'Description',
        },
      });

      const thread = await prisma.chatThread.create({
        data: {
          taskId: task.id,
          companyUserId: company.id,
          developerUserId: developer.id,
        },
      });

      // Developer marks as read
      const res = await request(app)
        .post(`/api/v1/me/chat/threads/${thread.id}/read`)
        .set('Authorization', `Bearer ${devToken}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);

      // Company should not have a read status
      const companyThreadRead = await prisma.chatThreadRead.findUnique({
        where: {
          threadId_userId: {
            threadId: thread.id,
            userId: company.id,
          },
        },
      });

      expect(companyThreadRead).toBeNull();
    });
  });
});
