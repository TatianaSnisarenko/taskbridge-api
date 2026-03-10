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

describe('tasks dispute routes', () => {
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

  test('POST /tasks/:taskId/dispute moves IN_PROGRESS task to DISPUTE', async () => {
    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: company.id, email: company.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'IN_PROGRESS',
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'In progress task',
        description: 'In progress task description',
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
      .post(`/api/v1/tasks/${task.id}/dispute`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ reason: 'Developer has been inactive for 5 days without updates.' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'DISPUTE',
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updatedTask.status).toBe('DISPUTE');

    const notification = await prisma.notification.findFirst({
      where: {
        userId: developer.id,
        taskId: task.id,
        type: 'TASK_DISPUTE_OPENED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).toBeTruthy();
  });

  test('POST /tasks/:taskId/dispute/resolve allows admin to resolve dispute', async () => {
    const admin = await createUser({ developerProfile: { displayName: 'Admin' } });
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    const adminToken = buildAccessToken({ userId: admin.id, email: admin.email });

    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'DISPUTE',
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Dispute task',
        description: 'Dispute task description',
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
      .post(`/api/v1/tasks/${task.id}/dispute/resolve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        action: 'RETURN_TO_PROGRESS',
        reason: 'Admin reviewed evidence and returned task to active progress.',
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'IN_PROGRESS',
      action: 'RETURN_TO_PROGRESS',
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updatedTask.status).toBe('IN_PROGRESS');
  });
});
