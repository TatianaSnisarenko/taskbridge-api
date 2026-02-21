import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('me routes', () => {
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
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token}`);

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
          type: 'TASK_COMPLETED',
          payload: { task_id: 'test-id-2' },
          createdAt: new Date('2026-02-14T11:00:00Z'),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`);

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
        type: 'TASK_COMPLETED',
        actor_user_id: actor.id,
        project_id: null,
        task_id: null,
        thread_id: null,
        payload: { task_id: 'test-id-2' },
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
          type: 'TASK_COMPLETED',
          payload: { task_id: 'test-id-2' },
          readAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications?unread_only=true')
        .set('Authorization', `Bearer ${token}`);

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

      // Create 3 unread and 2 read notifications
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
          type: 'TASK_COMPLETED',
          payload: { task_id: 'test-id-2' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'REVIEW_CREATED',
          payload: { review_id: 'test-id-3' },
        },
      });

      await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          type: 'APPLICATION_REJECTED',
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
        .set('Authorization', `Bearer ${token}`);

      expect(resAll.status).toBe(200);
      expect(resAll.body.total).toBe(5);
      expect(resAll.body.unread_total).toBe(3);

      // Get only unread notifications
      const resUnread = await request(app)
        .get('/api/v1/me/notifications?unread_only=true')
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(2);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(2);
      expect(res1.body.total).toBe(5);

      // Get second page with size 2
      const res2 = await request(app)
        .get('/api/v1/me/notifications?page=2&size=2')
        .set('Authorization', `Bearer ${token}`);

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
        .set('Authorization', `Bearer ${token1}`);

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

      const project = await prisma.project.create({
        data: {
          ownerUserId: actor.id,
          title: 'Test Project',
        },
      });

      const task = await prisma.task.create({
        data: {
          ownerUserId: actor.id,
          projectId: project.id,
          title: 'Test Task',
          description: 'Test',
          status: 'PUBLISHED',
        },
      });

      const notif = await prisma.notification.create({
        data: {
          userId: user.id,
          actorUserId: actor.id,
          projectId: project.id,
          taskId: task.id,
          type: 'TASK_COMPLETED',
          payload: { task_id: task.id },
        },
      });

      const res = await request(app)
        .get('/api/v1/me/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items[0]).toMatchObject({
        id: notif.id,
        type: 'TASK_COMPLETED',
        actor_user_id: actor.id,
        project_id: project.id,
        task_id: task.id,
        thread_id: null,
        payload: { task_id: task.id },
        read_at: null,
      });

      // Verify created_at is ISO string
      expect(typeof res.body.items[0].created_at).toBe('string');
      expect(res.body.items[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
