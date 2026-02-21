import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('applications routes', () => {
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

  describe('POST /applications/{applicationId}/accept', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app).post(
        '/api/v1/applications/3fa85f64-5717-4562-b3fc-2c963f66afa6/accept'
      );

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects non-company persona', async () => {
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const res = await request(app)
        .post('/api/v1/applications/3fa85f64-5717-4562-b3fc-2c963f66afa6/accept')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
    });

    test('returns 404 for non-existent application', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const res = await request(app)
        .post('/api/v1/applications/3fa85f64-5717-4562-b3fc-2c963f66afa6/accept')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 403 when user is not task owner', async () => {
      const company1 = await createUser({ companyProfile: { companyName: 'Company1' } });
      const company2 = await createUser({ companyProfile: { companyName: 'Company2' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const company2Token = buildAccessToken({ userId: company2.id, email: company2.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company1.id,
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-14T10:00:00Z'),
          title: 'Task',
          description: 'Description',
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
        .post(`/api/v1/applications/${application.id}/accept`)
        .set('Authorization', `Bearer ${company2Token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_OWNER');
    });

    test('returns 409 when task is not PUBLISHED', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          status: 'DRAFT',
          title: 'Task',
          description: 'Description',
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
        .post(`/api/v1/applications/${application.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

    test('returns 409 when task already has accepted application', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
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
        },
      });

      const app2 = await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: dev2.id,
          status: 'APPLIED',
        },
      });

      // Accept first application
      await request(app)
        .post(`/api/v1/applications/${app1.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      // Try to accept second application - should fail
      const res = await request(app)
        .post(`/api/v1/applications/${app2.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVALID_STATE');
    });

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

    test('rejects all other applications for the same task', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const dev3 = await createUser({ developerProfile: { displayName: 'Dev3' } });
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
        data: { taskId: task.id, developerUserId: dev1.id, status: 'APPLIED' },
      });

      const app2 = await prisma.application.create({
        data: { taskId: task.id, developerUserId: dev2.id, status: 'APPLIED' },
      });

      const app3 = await prisma.application.create({
        data: { taskId: task.id, developerUserId: dev3.id, status: 'APPLIED' },
      });

      const res = await request(app)
        .post(`/api/v1/applications/${app1.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);

      // Verify other applications are rejected
      const updatedApp2 = await prisma.application.findUnique({ where: { id: app2.id } });
      expect(updatedApp2.status).toBe('REJECTED');

      const updatedApp3 = await prisma.application.findUnique({ where: { id: app3.id } });
      expect(updatedApp3.status).toBe('REJECTED');
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

    test('creates APPLICATION_REJECTED notifications for other developers', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const dev1 = await createUser({ developerProfile: { displayName: 'Dev1' } });
      const dev2 = await createUser({ developerProfile: { displayName: 'Dev2' } });
      const dev3 = await createUser({ developerProfile: { displayName: 'Dev3' } });
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
        data: { taskId: task.id, developerUserId: dev1.id, status: 'APPLIED' },
      });

      const app2 = await prisma.application.create({
        data: { taskId: task.id, developerUserId: dev2.id, status: 'APPLIED' },
      });

      const app3 = await prisma.application.create({
        data: { taskId: task.id, developerUserId: dev3.id, status: 'APPLIED' },
      });

      await request(app)
        .post(`/api/v1/applications/${app1.id}/accept`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      // Check dev2 got rejected notification
      const notif2 = await prisma.notification.findFirst({
        where: {
          userId: dev2.id,
          type: 'APPLICATION_REJECTED',
          taskId: task.id,
        },
      });

      expect(notif2).toBeDefined();
      expect(notif2.payload.application_id).toBe(app2.id);

      // Check dev3 got rejected notification
      const notif3 = await prisma.notification.findFirst({
        where: {
          userId: dev3.id,
          type: 'APPLICATION_REJECTED',
          taskId: task.id,
        },
      });

      expect(notif3).toBeDefined();
      expect(notif3.payload.application_id).toBe(app3.id);
    });

    test('rejects invalid applicationId parameter', async () => {
      const company = await createUser({ companyProfile: { companyName: 'Company' } });
      const token = buildAccessToken({ userId: company.id, email: company.email });

      const res = await request(app)
        .post('/api/v1/applications/invalid-id/accept')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
