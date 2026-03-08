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

describe('tasks routes - reviews and delete', () => {
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

  test('POST /tasks/:taskId/reviews creates review from developer', async () => {
    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
    const devToken = buildAccessToken({ userId: developer.id, email: developer.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'COMPLETED',
        completedAt: new Date('2026-02-14T15:00:00Z'),
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Completed task',
        description: 'Completed task description',
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
      .post(`/api/v1/tasks/${task.id}/reviews`)
      .set('Authorization', `Bearer ${devToken}`)
      .set('X-Persona', 'developer')
      .send({ rating: 5, text: 'Great collaboration' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      review_id: expect.any(String),
      task_id: task.id,
      author_user_id: developer.id,
      target_user_id: company.id,
      rating: 5,
      text: 'Great collaboration',
      created_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);

    const notification = await prisma.notification.findFirst({
      where: {
        userId: company.id,
        taskId: task.id,
        type: 'REVIEW_CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).toMatchObject({
      userId: company.id,
      actorUserId: developer.id,
      taskId: task.id,
      type: 'REVIEW_CREATED',
      payload: {
        review_id: res.body.review_id,
        task_id: task.id,
        rating: 5,
      },
    });
  });

  test('POST /tasks/:taskId/reviews creates review from company owner', async () => {
    const company = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Dev' } });
    const companyToken = buildAccessToken({ userId: company.id, email: company.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        status: 'COMPLETED',
        completedAt: new Date('2026-02-14T15:00:00Z'),
        publishedAt: new Date('2026-02-14T10:00:00Z'),
        title: 'Completed task',
        description: 'Completed task description',
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
      .post(`/api/v1/tasks/${task.id}/reviews`)
      .set('Authorization', `Bearer ${companyToken}`)
      .set('X-Persona', 'company')
      .send({ rating: 4, text: 'Good work, professional' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      review_id: expect.any(String),
      task_id: task.id,
      author_user_id: company.id,
      target_user_id: developer.id,
      rating: 4,
      text: 'Good work, professional',
      created_at: expect.any(String),
    });

    const notification = await prisma.notification.findFirst({
      where: {
        userId: developer.id,
        taskId: task.id,
        type: 'REVIEW_CREATED',
      },
      orderBy: { createdAt: 'desc' },
    });

    expect(notification).toMatchObject({
      userId: developer.id,
      actorUserId: company.id,
      taskId: task.id,
      type: 'REVIEW_CREATED',
      payload: {
        review_id: res.body.review_id,
        task_id: task.id,
        rating: 4,
      },
    });
  });

  test('DELETE /tasks/:taskId deletes PUBLISHED task', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const task = await prisma.task.create({
      data: {
        ownerUserId: user.id,
        status: 'PUBLISHED',
        publishedAt: new Date(),
        title: 'Published task',
        description: 'Published task description',
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
      .delete(`/api/v1/tasks/${task.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      task_id: task.id,
      status: 'DELETED',
      deleted_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.deleted_at))).toBe(false);

    const deleted = await prisma.task.findUnique({ where: { id: task.id } });

    expect(deleted.status).toBe('DELETED');
    expect(deleted.deletedAt).toBeInstanceOf(Date);
  });
});
