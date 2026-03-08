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

describe('task candidates routes', () => {
  let companyUser;
  let companyToken;
  let otherCompanyToken;
  let task;
  let developerCanInvite;
  let developerApplied;
  let developerInvited;

  beforeAll(async () => {
    await resetDatabase();

    companyUser = await createUser({
      email: 'candidates-company@test.com',
      password: 'Password123!',
      emailVerified: true,
      companyProfile: {
        companyName: 'Candidates Corp',
      },
    });
    companyToken = buildAccessToken({ userId: companyUser.id, email: companyUser.email });

    const otherCompany = await createUser({
      email: 'other-company@test.com',
      password: 'Password123!',
      emailVerified: true,
      companyProfile: {
        companyName: 'Other Corp',
      },
    });
    otherCompanyToken = buildAccessToken({ userId: otherCompany.id, email: otherCompany.email });

    const javaTech = await prisma.technology.create({
      data: {
        slug: 'java-pr4',
        name: 'Java PR4',
        type: 'BACKEND',
      },
    });

    const nodeTech = await prisma.technology.create({
      data: {
        slug: 'node-pr4',
        name: 'Node PR4',
        type: 'BACKEND',
      },
    });

    await prisma.technology.create({
      data: {
        slug: 'react-pr4',
        name: 'React PR4',
        type: 'FRONTEND',
      },
    });

    task = await prisma.task.create({
      data: {
        ownerUserId: companyUser.id,
        title: 'Build recommendation API',
        description: 'Build recommendation API with ranking and filters.',
        category: 'BACKEND',
        type: 'EXPERIENCE',
        difficulty: 'SENIOR',
        estimatedEffortHours: 20,
        expectedDuration: 'DAYS_8_14',
        communicationLanguage: 'EN',
        timezonePreference: 'Europe/Any',
        applicationDeadline: new Date('2026-12-31'),
        visibility: 'PUBLIC',
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    await prisma.taskTechnology.createMany({
      data: [
        { taskId: task.id, technologyId: javaTech.id, isRequired: true },
        { taskId: task.id, technologyId: nodeTech.id, isRequired: true },
      ],
    });

    developerCanInvite = await createUser({
      email: 'candidate-1@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Senior Backend Dev',
        jobTitle: 'Java Node Developer',
        experienceLevel: 'SENIOR',
        availability: 'PART_TIME',
      },
    });

    developerApplied = await createUser({
      email: 'candidate-2@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Applied Developer',
        jobTitle: 'Java Engineer',
        experienceLevel: 'MIDDLE',
        availability: 'FULL_TIME',
      },
    });

    developerInvited = await createUser({
      email: 'candidate-3@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Invited Developer',
        jobTitle: 'Node Engineer',
        experienceLevel: 'JUNIOR',
        availability: 'FEW_HOURS_WEEK',
      },
    });

    const developerNoMatch = await createUser({
      email: 'candidate-4@test.com',
      password: 'Password123!',
      emailVerified: true,
      developerProfile: {
        displayName: 'Frontend Only',
        jobTitle: 'React Developer',
        experienceLevel: 'MIDDLE',
        availability: 'PART_TIME',
      },
    });

    await prisma.developerProfile.update({
      where: { userId: developerCanInvite.id },
      data: { avgRating: 4.8, reviewsCount: 12 },
    });

    await prisma.developerProfile.update({
      where: { userId: developerApplied.id },
      data: { avgRating: 4.4, reviewsCount: 7 },
    });

    await prisma.developerProfile.update({
      where: { userId: developerInvited.id },
      data: { avgRating: 4.2, reviewsCount: 5 },
    });

    const technologies = await prisma.technology.findMany({
      where: {
        slug: { in: ['java-pr4', 'node-pr4', 'react-pr4'] },
      },
      select: { id: true, slug: true },
    });

    const javaId = technologies.find((t) => t.slug === 'java-pr4').id;
    const nodeId = technologies.find((t) => t.slug === 'node-pr4').id;
    const reactId = technologies.find((t) => t.slug === 'react-pr4').id;

    await prisma.developerTechnology.createMany({
      data: [
        { developerUserId: developerCanInvite.id, technologyId: javaId, proficiencyYears: 5 },
        { developerUserId: developerCanInvite.id, technologyId: nodeId, proficiencyYears: 4 },
        { developerUserId: developerApplied.id, technologyId: javaId, proficiencyYears: 3 },
        { developerUserId: developerInvited.id, technologyId: nodeId, proficiencyYears: 2 },
        { developerUserId: developerNoMatch.id, technologyId: reactId, proficiencyYears: 4 },
      ],
    });

    await prisma.application.create({
      data: {
        taskId: task.id,
        developerUserId: developerApplied.id,
        status: 'APPLIED',
        message: 'I can handle this task quickly.',
      },
    });

    await prisma.taskInvite.create({
      data: {
        taskId: task.id,
        companyUserId: companyUser.id,
        developerUserId: developerInvited.id,
        status: 'PENDING',
      },
    });
  });

  describe('GET /tasks/:taskId/recommended-developers', () => {
    it('returns 401 without auth', async () => {
      const response = await request(app).get(`/api/v1/tasks/${task.id}/recommended-developers`);
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-company persona', async () => {
      const developerToken = buildAccessToken({
        userId: developerCanInvite.id,
        email: developerCanInvite.email,
      });

      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/recommended-developers`)
        .set('Authorization', `Bearer ${developerToken}`)
        .set('X-Persona', 'developer');

      expect(response.status).toBe(403);
    });

    it('returns 403 for non-owner company', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/recommended-developers`)
        .set('Authorization', `Bearer ${otherCompanyToken}`)
        .set('X-Persona', 'company');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('NOT_OWNER');
    });

    it('returns top recommended developers with can_invite=true only', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/recommended-developers`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .query({ limit: 3 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBe(1);
      expect(response.body.items[0].user_id).toBe(developerCanInvite.id);
      expect(response.body.items[0].can_invite).toBe(true);
      expect(response.body.items[0].already_applied).toBe(false);
      expect(response.body.items[0].already_invited).toBe(false);
    });
  });

  describe('GET /tasks/:taskId/candidates', () => {
    it('returns paginated candidates list', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/candidates`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .query({ page: 1, size: 20 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.total).toBe(3);
      expect(response.body.items.some((item) => item.user_id === developerApplied.id)).toBe(true);
      expect(response.body.items.some((item) => item.user_id === developerInvited.id)).toBe(true);
    });

    it('supports exclude_applied and exclude_invited filters', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/candidates`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .query({ exclude_applied: true, exclude_invited: true });

      expect(response.status).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.items[0].user_id).toBe(developerCanInvite.id);
    });

    it('supports search by tech or role', async () => {
      const response = await request(app)
        .get(`/api/v1/tasks/${task.id}/candidates`)
        .set('Authorization', `Bearer ${companyToken}`)
        .set('X-Persona', 'company')
        .query({ search: 'Java Node' });

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      expect(response.body.items[0].matched_technologies.length).toBeGreaterThan(0);
    });
  });
});
