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

describe('tasks report routes', () => {
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

  test('POST /tasks/:taskId/reports creates task report', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const reporter = await createUser({ developerProfile: { displayName: 'Reporter' } });
    const token = buildAccessToken({ userId: reporter.id, email: reporter.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'PUBLISHED',
        title: 'Reportable task',
        description: 'Task description',
        visibility: 'PUBLIC',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/reports`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'developer')
      .send({ reason: 'SPAM', comment: 'Spam task' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      report_id: expect.any(String),
      created_at: expect.any(String),
    });

    const report = await prisma.taskReport.findUnique({ where: { id: res.body.report_id } });
    expect(report).toMatchObject({
      taskId: task.id,
      reporterUserId: reporter.id,
      reporterPersona: 'developer',
      reason: 'SPAM',
      comment: 'Spam task',
      status: 'OPEN',
    });
  });

  test('GET /tasks/reports returns reports for moderator', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const reporter = await createUser({ developerProfile: { displayName: 'Reporter' } });
    const moderator = await createUser({ emailVerified: true });
    await prisma.user.update({
      where: { id: moderator.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });
    const token = buildAccessToken({ userId: moderator.id, email: moderator.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'PUBLISHED',
        title: 'Task under moderation',
        description: 'Task description',
        visibility: 'PUBLIC',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
      },
    });

    await prisma.taskReport.create({
      data: {
        taskId: task.id,
        reporterUserId: reporter.id,
        reporterPersona: 'developer',
        reason: 'MISLEADING',
        comment: 'Looks misleading',
      },
    });

    const res = await request(app)
      .get('/api/v1/tasks/reports?status=OPEN')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({
      target_type: 'task',
      target_id: task.id,
      reason: 'MISLEADING',
      status: 'OPEN',
    });
  });

  test('PATCH /tasks/reports/:reportId/resolve with DELETE soft-deletes task', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const reporter = await createUser({ developerProfile: { displayName: 'Reporter' } });
    const moderator = await createUser({ emailVerified: true });
    await prisma.user.update({
      where: { id: moderator.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });
    const token = buildAccessToken({ userId: moderator.id, email: moderator.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        status: 'IN_PROGRESS',
        title: 'Task for report resolution',
        description: 'Task description',
        visibility: 'PUBLIC',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
      },
    });

    const report = await prisma.taskReport.create({
      data: {
        taskId: task.id,
        reporterUserId: reporter.id,
        reporterPersona: 'developer',
        reason: 'SCAM',
      },
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/reports/${report.id}/resolve`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'DELETE', note: 'Confirmed violation' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      report_id: report.id,
      status: 'RESOLVED',
      action: 'DELETE',
      resolved_at: expect.any(String),
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updatedTask.status).toBe('DELETED');
    expect(updatedTask.deletedAt).toBeInstanceOf(Date);

    const updatedReport = await prisma.taskReport.findUnique({ where: { id: report.id } });
    expect(updatedReport).toMatchObject({
      status: 'RESOLVED',
      resolutionAction: 'DELETE',
      resolvedByUserId: moderator.id,
    });
    expect(updatedReport.resolvedAt).toBeInstanceOf(Date);
  });
});
