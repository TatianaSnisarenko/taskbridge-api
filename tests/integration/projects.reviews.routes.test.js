import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';

jest.unstable_mockModule('../../src/services/email/index.js', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn().mockResolvedValue(undefined),
}));

const { createApp } = await import('../../src/app.js');

const app = createApp();

describe('projects routes - reviews', () => {
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

  test('GET /projects/:projectId/reviews returns empty list when project has no reviews', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TechCorp' } });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: 'Empty Project',
        shortDescription: 'No reviews yet',
        description: 'Project with no reviews',
        visibility: 'PUBLIC',
      },
    });

    const res = await request(app).get(`/api/v1/projects/${project.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.stats.company_reviews_count).toBe(0);
    expect(res.body.stats.developer_reviews_count).toBe(0);
  });

  test('GET /projects/:projectId/reviews returns project reviews with task context', async () => {
    const company = await createUser({ companyProfile: { companyName: 'Acme Corp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Bob Dev' } });

    const project = await prisma.project.create({
      data: {
        ownerUserId: company.id,
        title: 'Review Test Project',
        shortDescription: 'Test project',
        description: 'A project with reviews',
        visibility: 'PUBLIC',
      },
    });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        projectId: project.id,
        status: 'COMPLETED',
        title: 'Implementation Task',
        description: 'Task description',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'MIDDLE',
        estimatedEffortHours: 10,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-20'),
        visibility: 'PUBLIC',
        deliverables: [],
        requirements: [],
        niceToHave: [],
        completedAt: new Date(),
      },
    });

    const appEntity = await prisma.application.create({
      data: {
        taskId: task.id,
        developerUserId: developer.id,
        message: 'I can do it',
        status: 'ACCEPTED',
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { acceptedApplicationId: appEntity.id },
    });

    // Create review
    await prisma.review.create({
      data: {
        taskId: task.id,
        authorUserId: company.id,
        targetUserId: developer.id,
        rating: 5,
        text: 'Perfect work',
      },
    });

    const res = await request(app).get(`/api/v1/projects/${project.id}/reviews`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].task_id).toBe(task.id);
    expect(res.body.items[0].task_title).toBe('Implementation Task');
    expect(res.body.items[0].author_persona).toBe('company');
    expect(res.body.items[0].rating).toBe(5);
    expect(res.body.stats.company_reviews_count).toBe(1);
  });

  test('GET /projects/:projectId/reviews filters by author_persona', async () => {
    const company = await createUser({ companyProfile: { companyName: 'Acme Corp' } });
    const developer = await createUser({ developerProfile: { displayName: 'Alice' } });

    const project = await prisma.project.create({
      data: {
        ownerUserId: company.id,
        title: 'Filter Test Project',
        shortDescription: 'Test',
        description: 'Test',
        visibility: 'PUBLIC',
      },
    });

    const task = await prisma.task.create({
      data: {
        ownerUserId: company.id,
        projectId: project.id,
        status: 'COMPLETED',
        title: 'Task',
        description: 'Task',
        category: 'BACKEND',
        type: 'PAID',
        difficulty: 'JUNIOR',
        estimatedEffortHours: 5,
        expectedDuration: 'DAYS_1_7',
        communicationLanguage: 'EN',
        timezonePreference: 'UTC',
        applicationDeadline: new Date('2026-03-20'),
        visibility: 'PUBLIC',
        deliverables: [],
        requirements: [],
        niceToHave: [],
        completedAt: new Date(),
      },
    });

    const appEntity = await prisma.application.create({
      data: {
        taskId: task.id,
        developerUserId: developer.id,
        message: 'I can do it',
        status: 'ACCEPTED',
      },
    });

    await prisma.task.update({
      where: { id: task.id },
      data: { acceptedApplicationId: appEntity.id },
    });

    // Create both company and developer reviews
    await prisma.review.create({
      data: {
        taskId: task.id,
        authorUserId: company.id,
        targetUserId: developer.id,
        rating: 5,
      },
    });

    await prisma.review.create({
      data: {
        taskId: task.id,
        authorUserId: developer.id,
        targetUserId: company.id,
        rating: 4,
      },
    });

    // Filter by company
    const resCompany = await request(app).get(
      `/api/v1/projects/${project.id}/reviews?author_persona=company`
    );

    expect(resCompany.status).toBe(200);
    expect(resCompany.body.items).toHaveLength(1);
    expect(resCompany.body.items[0].author_persona).toBe('company');

    // Filter by developer
    const resDev = await request(app).get(
      `/api/v1/projects/${project.id}/reviews?author_persona=developer`
    );

    expect(resDev.status).toBe(200);
    expect(resDev.body.items).toHaveLength(1);
    expect(resDev.body.items[0].author_persona).toBe('developer');
  });

  test('GET /projects/:projectId/reviews returns 404 for nonexistent project', async () => {
    const fakeId = '123e4567-e89b-42d3-a456-426614174000';
    const res = await request(app).get(`/api/v1/projects/${fakeId}/reviews`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
