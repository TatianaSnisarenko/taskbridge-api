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
const originalProjectUpdate = prisma.project.update.bind(prisma.project);
const originalTaskCreate = prisma.task.create.bind(prisma.task);

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
    prisma.project.create = (args) => {
      if (Array.isArray(args?.data?.technologies)) {
        // eslint-disable-next-line no-unused-vars
        const { technologies, ...rest } = args.data;
        return originalProjectCreate({ ...args, data: rest });
      }

      return originalProjectCreate(args);
    };

    prisma.project.update = (args) => {
      if (Array.isArray(args?.data?.technologies)) {
        // eslint-disable-next-line no-unused-vars
        const { technologies, ...rest } = args.data;
        return originalProjectUpdate({ ...args, data: rest });
      }

      return originalProjectUpdate(args);
    };

    prisma.task.create = (args) => {
      return originalTaskCreate(args);
    };

    await prisma.$connect();
  });

  afterAll(async () => {
    prisma.project.create = originalProjectCreate;
    prisma.project.update = originalProjectUpdate;
    prisma.task.create = originalTaskCreate;
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await resetDatabase();
  });

  describe('GET /projects/:projectId', () => {
    test('public users only see PUBLISHED+PUBLIC tasks in preview', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Test Project',
          shortDescription: 'Test',
          description: 'Test description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      // Create draft task (not visible to public)
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Draft task',
          description: 'Draft',
          status: 'DRAFT',
          visibility: 'PUBLIC',
          publishedAt: new Date(),
        },
      });

      // Create published unlisted task (not visible to public)
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published unlisted task',
          description: 'Unlisted',
          status: 'PUBLISHED',
          visibility: 'UNLISTED',
          publishedAt: new Date(),
        },
      });

      // Create published public task (visible to public)
      const visibleTask = await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published public task',
          description: 'Public',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          publishedAt: new Date(),
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}`);

      expect(res.status).toBe(200);
      expect(res.body.tasks_preview).toHaveLength(1);
      expect(res.body.tasks_preview[0].id).toBe(visibleTask.id);
    });

    test('developers CAN see ARCHIVED projects they worked on', async () => {
      const company = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const developer = await createUser({ developerProfile: { displayName: 'John Dev' } });
      const token = buildAccessToken({ userId: developer.id, email: developer.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: company.id,
          title: 'Archived Project',
          shortDescription: 'Archived',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          status: 'ARCHIVED',
        },
      });

      const task = await prisma.task.create({
        data: {
          ownerUserId: company.id,
          projectId: project.id,
          title: 'Task 1',
          description: 'Description',
          status: 'COMPLETED',
          visibility: 'PUBLIC',
          publishedAt: new Date(),
        },
      });

      // Create accepted application for developer
      await prisma.application.create({
        data: {
          taskId: task.id,
          developerUserId: developer.id,
          status: 'ACCEPTED',
          message: 'Interested',
        },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Archived Project');
      expect(res.body.status).toBe('ARCHIVED');
    });
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
      visibility: projectPayload.visibility,
      status: projectPayload.status,
      maxTalents: projectPayload.max_talents,
    });
  });

  describe('POST /projects/:projectId/reports', () => {
    test('creates report successfully', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const reporter = await createUser({ developerProfile: { displayName: 'Reporter' } });
      const token = buildAccessToken({ userId: reporter.id, email: reporter.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Reportable project',
          shortDescription: 'Short',
          description: 'Description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM', comment: 'This is spam' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        report_id: expect.any(String),
        created_at: expect.any(String),
      });
      expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

      const report = await prisma.projectReport.findUnique({
        where: { id: res.body.report_id },
      });

      expect(report).toMatchObject({
        projectId: project.id,
        reporterUserId: reporter.id,
        reporterPersona: 'developer',
        reason: 'SPAM',
        comment: 'This is spam',
      });
    });
  });

  describe('GET /projects/{projectId}/tasks', () => {
    test('returns published public tasks for public users', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Project with tasks',
          shortDescription: 'Short',
          description: 'Description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      // Create published public task
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published Public Task',
          description: 'Public task description',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      // Create draft task (should not appear for public)
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Draft Task',
          description: 'Draft task description',
          status: 'DRAFT',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      // Create published unlisted task (should not appear for public)
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published Unlisted Task',
          description: 'Unlisted task description',
          status: 'PUBLISHED',
          visibility: 'UNLISTED',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}/tasks`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Published Public Task');
      expect(res.body.total).toBe(1);
    });
  });
});
