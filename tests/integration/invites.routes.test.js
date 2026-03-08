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

let companyUser;
let companyToken;
let developerUser;
let developerUser2;
let developerToken2;
let publishedTask;

describe('invites routes', () => {
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

    await resetDatabase();

    companyUser = await createUser({
      email: 'invitecompany@test.com',
      password: 'Password123!',
      emailVerified: true,
      companyProfile: {
        companyName: 'Test Company',
      },
    });
    companyToken = buildAccessToken({ userId: companyUser.id, email: companyUser.email });

    developerUser = await createUser({
      email: 'invitedev1@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Invited Dev 1',
        experienceLevel: 'JUNIOR',
      },
    });

    developerUser2 = await createUser({
      email: 'invitedev2@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Invited Dev 2',
        experienceLevel: 'JUNIOR',
      },
    });
    developerToken2 = buildAccessToken({ userId: developerUser2.id, email: developerUser2.email });

    publishedTask = await prisma.task.create({
      data: {
        ownerUserId: companyUser.id,
        title: 'Test Task for Invites',
        description: 'Task description',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'JUNIOR',
        estimatedEffortHours: 10,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-12-31'),
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    prisma.task.create = originalTaskCreate;
    prisma.task.update = originalTaskUpdate;
    prisma.project.create = originalProjectCreate;
  });

  describe('POST /tasks/{taskId}/invites', () => {
    it('creates invite successfully', async () => {
      const res = await request(app)
        .post(`/api/v1/tasks/${publishedTask.id}/invites`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .send({
          developer_id: developerUser.id,
          message: 'We think you would be a great fit for this task.',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.task_id).toBe(publishedTask.id);
      expect(res.body.developer_user_id).toBe(developerUser.id);
    });
  });

  describe('POST /invites/{inviteId}/accept', () => {
    let inviteId;

    beforeAll(async () => {
      const task = await prisma.task.create({
        data: {
          ownerUserId: companyUser.id,
          title: 'Accept Invite Task',
          description: 'Task description',
          category: 'BACKEND',
          type: 'EXPERIENCE',
          difficulty: 'JUNIOR',
          estimatedEffortHours: 6,
          expectedDuration: 'DAYS_8_14',
          communicationLanguage: 'EN',
          timezonePreference: 'Europe/Any',
          applicationDeadline: new Date('2026-12-31'),
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      const invite = await prisma.taskInvite.create({
        data: {
          taskId: task.id,
          companyUserId: companyUser.id,
          developerUserId: developerUser2.id,
          status: 'PENDING',
        },
      });
      inviteId = invite.id;
    });

    it('accepts invite', async () => {
      const res = await request(app)
        .post(`/api/v1/invites/${inviteId}/accept`)
        .set('Authorization', `Bearer ${developerToken2}`)
        .set('X-Persona', 'developer');

      expect(res.status).toBe(200);
      expect(res.body.invite_id).toBe(inviteId);
      expect(res.body.task_status).toBe('IN_PROGRESS');
    });
  });
});
