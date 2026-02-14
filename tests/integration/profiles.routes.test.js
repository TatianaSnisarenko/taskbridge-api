import { jest } from '@jest/globals';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

const basePayload = {
  display_name: 'Tetiana',
  primary_role: 'Java Backend Engineer',
  bio: 'Experienced developer with passion for clean code',
  experience_level: 'SENIOR',
  location: 'Ukraine',
  timezone: 'Europe/Zaporozhye',
  skills: ['Java', 'Spring'],
  tech_stack: ['Spring Boot', 'JPA'],
  availability: 'FEW_HOURS_WEEK',
  preferred_task_categories: ['BACKEND'],
  portfolio_url: 'https://example.com/portfolio',
  github_url: 'https://github.com/example',
  linkedin_url: 'https://linkedin.com/in/example',
};

const companyPayload = {
  company_name: 'TeamUp Studio',
  company_type: 'STARTUP',
  description: 'We build platforms for remote teams',
  team_size: 4,
  country: 'UA',
  timezone: 'Europe/Zaporozhye',
  contact_email: 'contact@teamup.dev',
  website_url: 'https://teamup.dev',
  links: { linkedin: 'https://linkedin.com/company/teamup' },
};

describe('profiles routes', () => {
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

  test('POST /profiles/developer rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/profiles/developer').send(basePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /profiles/developer rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', 'Bearer invalid')
      .send(basePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('POST /profiles/developer rejects invalid payload', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('POST /profiles/developer validates display_name min length', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'display_name',
          issue: 'Display name must be at least 2 characters',
        }),
      ])
    );
  });

  test('POST /profiles/developer validates bio min length', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'Test', bio: 'Short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'bio',
          issue: 'Bio must be at least 10 characters',
        }),
      ])
    );
  });

  test('POST /profiles/developer validates experience_level enum', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'Test', experience_level: 'EXPERT' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'experience_level',
          issue: 'Experience level must be one of: STUDENT, JUNIOR, MIDDLE, SENIOR',
        }),
      ])
    );
  });

  test('POST /profiles/developer validates URL format', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'Test', portfolio_url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'portfolio_url',
          issue: 'Portfolio URL must be a valid URI',
        }),
      ])
    );
  });

  test('POST /profiles/developer rejects duplicate profile', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Dev' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFILE_ALREADY_EXISTS');
  });

  test('POST /profiles/developer creates profile', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user_id: user.id, created: true });

    const profile = await prisma.developerProfile.findUnique({ where: { userId: user.id } });

    expect(profile).toMatchObject({
      userId: user.id,
      displayName: basePayload.display_name,
      jobTitle: basePayload.primary_role,
      bio: basePayload.bio,
      experienceLevel: basePayload.experience_level,
      location: basePayload.location,
      timezone: basePayload.timezone,
      skills: basePayload.skills,
      techStack: basePayload.tech_stack,
      availability: basePayload.availability,
      preferredTaskCategories: basePayload.preferred_task_categories,
      portfolioUrl: basePayload.portfolio_url,
      githubUrl: basePayload.github_url,
      linkedinUrl: basePayload.linkedin_url,
    });
  });

  test('PUT /profiles/developer rejects unauthorized', async () => {
    const res = await request(app).put('/api/v1/profiles/developer').send(basePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('PUT /profiles/developer rejects invalid payload', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Old' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send({ display_name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'display_name',
          issue: 'Display name must be at least 2 characters',
        }),
      ])
    );
  });

  test('PUT /profiles/developer rejects missing profile', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  test('PUT /profiles/developer updates profile', async () => {
    const user = await createUser({ developerProfile: { displayName: 'Old' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/developer')
      .set('Authorization', `Bearer ${token}`)
      .send(basePayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user_id: user.id,
      updated: true,
      updated_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.updated_at))).toBe(false);

    const profile = await prisma.developerProfile.findUnique({ where: { userId: user.id } });

    expect(profile).toMatchObject({
      userId: user.id,
      displayName: basePayload.display_name,
      jobTitle: basePayload.primary_role,
      bio: basePayload.bio,
      experienceLevel: basePayload.experience_level,
      location: basePayload.location,
      timezone: basePayload.timezone,
      skills: basePayload.skills,
      techStack: basePayload.tech_stack,
      availability: basePayload.availability,
      preferredTaskCategories: basePayload.preferred_task_categories,
      portfolioUrl: basePayload.portfolio_url,
      githubUrl: basePayload.github_url,
      linkedinUrl: basePayload.linkedin_url,
    });
  });

  test('GET /profiles/developer/:userId rejects invalid userId', async () => {
    const res = await request(app).get('/api/v1/profiles/developer/not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'userId',
          issue: 'User id must be a valid UUID',
        }),
      ])
    );
  });

  test('GET /profiles/developer/:userId returns 404 for missing profile', async () => {
    const user = await createUser();

    const res = await request(app).get(`/api/v1/profiles/developer/${user.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  test('GET /profiles/developer/:userId returns public profile', async () => {
    const user = await createUser({
      developerProfile: {
        displayName: 'Tetiana',
        jobTitle: 'Java Backend Engineer',
        bio: 'Short bio',
        experienceLevel: 'SENIOR',
        location: 'Ukraine',
        timezone: 'Europe/Zaporozhye',
        skills: ['Java', 'Spring'],
        techStack: ['Spring Boot', 'JPA'],
        portfolioUrl: 'https://example.com/portfolio',
        githubUrl: 'https://github.com/example',
        linkedinUrl: 'https://linkedin.com/in/example',
        avgRating: 4.7,
        reviewsCount: 12,
      },
    });

    const res = await request(app).get(`/api/v1/profiles/developer/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user_id: user.id,
      display_name: 'Tetiana',
      primary_role: 'Java Backend Engineer',
      bio: 'Short bio',
      experience_level: 'SENIOR',
      location: 'Ukraine',
      timezone: 'Europe/Zaporozhye',
      skills: ['Java', 'Spring'],
      tech_stack: ['Spring Boot', 'JPA'],
      portfolio_url: 'https://example.com/portfolio',
      github_url: 'https://github.com/example',
      linkedin_url: 'https://linkedin.com/in/example',
      avg_rating: 4.7,
      reviews_count: 12,
    });
  });

  test('POST /profiles/company rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/profiles/company').send(companyPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /profiles/company rejects invalid payload', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'company_name',
          issue: 'Company name must be at least 2 characters',
        }),
      ])
    );
  });

  test('POST /profiles/company validates contact_email format', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'TeamUp', contact_email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'contact_email',
          issue: 'Contact email must be a valid email',
        }),
      ])
    );
  });

  test('POST /profiles/company rejects duplicate profile', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send(companyPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROFILE_ALREADY_EXISTS');
  });

  test('POST /profiles/company creates profile', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send(companyPayload);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ user_id: user.id, created: true });

    const profile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });

    expect(profile).toMatchObject({
      userId: user.id,
      companyName: companyPayload.company_name,
      companyType: companyPayload.company_type,
      description: companyPayload.description,
      teamSize: companyPayload.team_size,
      country: companyPayload.country,
      timezone: companyPayload.timezone,
      contactEmail: companyPayload.contact_email,
      websiteUrl: companyPayload.website_url,
      links: companyPayload.links,
    });
  });

  test('PUT /profiles/company rejects unauthorized', async () => {
    const res = await request(app).put('/api/v1/profiles/company').send(companyPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('PUT /profiles/company rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'Old' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_name: 'A' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'company_name',
          issue: 'Company name must be at least 2 characters',
        }),
      ])
    );
  });

  test('PUT /profiles/company rejects missing profile', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send(companyPayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  test('PUT /profiles/company updates profile', async () => {
    const user = await createUser({ companyProfile: { companyName: 'Old' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/profiles/company')
      .set('Authorization', `Bearer ${token}`)
      .send(companyPayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user_id: user.id,
      updated: true,
      updated_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.updated_at))).toBe(false);

    const profile = await prisma.companyProfile.findUnique({ where: { userId: user.id } });

    expect(profile).toMatchObject({
      userId: user.id,
      companyName: companyPayload.company_name,
      companyType: companyPayload.company_type,
      description: companyPayload.description,
      teamSize: companyPayload.team_size,
      country: companyPayload.country,
      timezone: companyPayload.timezone,
      contactEmail: companyPayload.contact_email,
      websiteUrl: companyPayload.website_url,
      links: companyPayload.links,
    });
  });

  test('GET /profiles/company/:userId rejects invalid userId', async () => {
    const res = await request(app).get('/api/v1/profiles/company/not-a-uuid');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'userId',
          issue: 'User id must be a valid UUID',
        }),
      ])
    );
  });

  test('GET /profiles/company/:userId returns 404 for missing profile', async () => {
    const user = await createUser();

    const res = await request(app).get(`/api/v1/profiles/company/${user.id}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PROFILE_NOT_FOUND');
  });

  test('GET /profiles/company/:userId returns public profile', async () => {
    const user = await createUser({
      companyProfile: {
        companyName: 'TeamUp Studio',
        companyType: 'STARTUP',
        description: 'We build...',
        teamSize: 4,
        country: 'UA',
        timezone: 'Europe/Zaporozhye',
        websiteUrl: 'https://teamup.dev',
        links: { linkedin: 'https://linkedin.com/company/teamup' },
        verified: false,
        avgRating: 4.6,
        reviewsCount: 8,
      },
    });

    const res = await request(app).get(`/api/v1/profiles/company/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user_id: user.id,
      company_name: 'TeamUp Studio',
      company_type: 'STARTUP',
      description: 'We build...',
      team_size: 4,
      country: 'UA',
      timezone: 'Europe/Zaporozhye',
      website_url: 'https://teamup.dev',
      links: { linkedin: 'https://linkedin.com/company/teamup' },
      verified: false,
      avg_rating: 4.6,
      reviews_count: 8,
    });
  });
});
