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
    expect(res.body).toMatchObject({
      task_id: task.id,
      status: 'DISPUTE',
      dispute_id: expect.any(String),
    });

    const updatedTask = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updatedTask.status).toBe('DISPUTE');

    const dispute = await prisma.taskDispute.findUnique({
      where: { id: res.body.dispute_id },
    });
    expect(dispute).toMatchObject({
      taskId: task.id,
      initiatorUserId: company.id,
      initiatorPersona: 'company',
      sourceStatus: 'IN_PROGRESS',
      reasonType: 'DEVELOPER_UNRESPONSIVE',
      status: 'OPEN',
    });

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
      data: { roles: ['USER', 'ADMIN'] },
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

    await prisma.taskDispute.create({
      data: {
        taskId: task.id,
        initiatorUserId: company.id,
        initiatorPersona: 'company',
        sourceStatus: 'IN_PROGRESS',
        reasonType: 'DEVELOPER_UNRESPONSIVE',
        reasonText: 'Developer is inactive and company opened dispute.',
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

  test('POST /tasks/:taskId/completion/escalate lets developer escalate overdue confirmation', async () => {
    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
    const developerToken = buildAccessToken({ userId: developer.id, email: developer.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'COMPLETION_REQUESTED',
        completionRequestedAt: new Date('2026-03-01T10:00:00Z'),
        completionRequestExpiresAt: new Date('2026-03-02T10:00:00Z'),
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Overdue completion request',
        description: 'Task waiting for company confirmation for too long.',
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
      .post(`/api/v1/tasks/${task.id}/completion/escalate`)
      .set('Authorization', `Bearer ${developerToken}`)
      .set('X-Persona', 'developer')
      .send({ reason: 'Company did not respond after the completion confirmation deadline.' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      task_id: task.id,
      status: 'DISPUTE',
      dispute_id: expect.any(String),
    });

    const dispute = await prisma.taskDispute.findUnique({ where: { id: res.body.dispute_id } });
    expect(dispute).toMatchObject({
      taskId: task.id,
      initiatorUserId: developer.id,
      initiatorPersona: 'developer',
      sourceStatus: 'COMPLETION_REQUESTED',
      reasonType: 'COMPLETION_NOT_CONFIRMED',
      status: 'OPEN',
    });
  });

  test('GET /tasks/disputes returns disputes for moderator', async () => {
    const moderator = await createUser({ developerProfile: { displayName: 'Moderator' } });
    await prisma.user.update({
      where: { id: moderator.id },
      data: { roles: ['USER', 'MODERATOR'] },
    });
    const moderatorToken = buildAccessToken({ userId: moderator.id, email: moderator.email });

    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'DISPUTE',
        completionRequestedAt: new Date('2026-03-01T10:00:00Z'),
        completionRequestExpiresAt: new Date('2026-03-02T10:00:00Z'),
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Dispute list task',
        description: 'Task included in moderator dispute queue.',
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

    await prisma.taskDispute.create({
      data: {
        taskId: task.id,
        initiatorUserId: developer.id,
        initiatorPersona: 'developer',
        sourceStatus: 'COMPLETION_REQUESTED',
        reasonType: 'COMPLETION_NOT_CONFIRMED',
        reasonText: 'Company did not respond after completion was requested.',
      },
    });

    const res = await request(app)
      .get('/api/v1/tasks/disputes?status=OPEN')
      .set('Authorization', `Bearer ${moderatorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0]).toMatchObject({
      task_id: task.id,
      task_title: 'Dispute list task',
      task_status: 'DISPUTE',
      company_user_id: company.id,
      company_name: 'TeamUp',
      developer_user_id: developer.id,
      developer_display_name: 'Dev',
      initiator_user_id: developer.id,
      initiator_persona: 'developer',
      source_status: 'COMPLETION_REQUESTED',
      reason_type: 'COMPLETION_NOT_CONFIRMED',
      status: 'OPEN',
      available_actions: ['RETURN_TO_PROGRESS', 'MARK_FAILED', 'MARK_COMPLETED'],
    });
  });
});
