import { jest } from '@jest/globals';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { prisma } from '../../src/db/prisma.js';
import { resetDatabase } from '../helpers/db.js';
import { buildAccessToken } from '../helpers/auth.js';
import { createUser } from '../helpers/factories.js';

const { createApp } = await import('../../src/app.js');

const app = createApp();

const projectPayload = {
  title: 'TeamUp MVP',
  short_description: 'Build MVP for marketplace',
  description: 'Longer description for the marketplace project',
  technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
  visibility: 'PUBLIC',
  status: 'ACTIVE',
  max_talents: 3,
};

const updatePayload = {
  title: 'TeamUp MVP',
  short_description: 'Updated short',
  description: 'Updated long description',
  technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
  visibility: 'PUBLIC',
  status: 'ACTIVE',
  max_talents: 5,
};

describe('projects routes', () => {
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

  describe('GET /projects', () => {
    test('returns public projects catalog by default', async () => {
      const user1 = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const user2 = await createUser({ companyProfile: { companyName: 'DevHub' } });

      await prisma.project.create({
        data: {
          ownerUserId: user1.id,
          title: 'TeamUp MVP',
          shortDescription: 'Build MVP for marketplace',
          description: 'Full description',
          technologies: ['Node.js', 'Prisma'],
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          maxTalents: 3,
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: user2.id,
          title: 'Backend API',
          shortDescription: 'REST API development',
          description: 'Full description',
          technologies: ['Python', 'FastAPI'],
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          maxTalents: 2,
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: user1.id,
          title: 'Private Project',
          shortDescription: 'Internal tool',
          description: 'Full description',
          technologies: ['Go'],
          visibility: 'UNLISTED',
          status: 'ACTIVE',
          maxTalents: 1,
        },
      });

      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(20);
      expect(res.body.total).toBe(2);
      expect(res.body.items[0]).toMatchObject({
        project_id: expect.any(String),
        title: expect.any(String),
        short_description: expect.any(String),
        technologies: expect.any(Array),
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        max_talents: expect.any(Number),
        created_at: expect.any(String),
        company: {
          user_id: expect.any(String),
          company_name: expect.any(String),
          verified: expect.any(Boolean),
          avg_rating: expect.any(Number),
          reviews_count: expect.any(Number),
        },
      });
    });

    test('filters by search query', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'TeamUp MVP',
          shortDescription: 'Build MVP for marketplace',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'Other Project',
          shortDescription: 'Something else',
          description: 'Full description',
          technologies: ['Python'],
          visibility: 'PUBLIC',
        },
      });

      const res = await request(app).get('/api/v1/projects?search=teamup');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('TeamUp MVP');
    });

    test('filters by technology', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'Node Project',
          shortDescription: 'Node.js project',
          description: 'Full description',
          technologies: ['Node.js', 'Prisma'],
          visibility: 'PUBLIC',
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'Python Project',
          shortDescription: 'Python project',
          description: 'Full description',
          technologies: ['Python'],
          visibility: 'PUBLIC',
        },
      });

      const res = await request(app).get('/api/v1/projects?technology=Prisma');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Node Project');
    });

    test('supports pagination', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      for (let i = 1; i <= 25; i++) {
        await prisma.project.create({
          data: {
            ownerUserId: user.id,
            title: `Project ${i}`,
            shortDescription: `Description ${i}`,
            description: 'Full description',
            technologies: ['Node.js'],
            visibility: 'PUBLIC',
          },
        });
      }

      const res = await request(app).get('/api/v1/projects?page=2&size=10');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(10);
      expect(res.body.page).toBe(2);
      expect(res.body.size).toBe(10);
      expect(res.body.total).toBe(25);
    });

    test('returns only owner projects when owner=true', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const other = await createUser({ companyProfile: { companyName: 'Other Company' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

      await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'My Project',
          shortDescription: 'My project',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: other.id,
          title: 'Other Project',
          shortDescription: 'Other project',
          description: 'Full description',
          technologies: ['Python'],
          visibility: 'PUBLIC',
        },
      });

      const res = await request(app)
        .get('/api/v1/projects?owner=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('My Project');
    });

    test('owner=true requires authentication', async () => {
      const res = await request(app).get('/api/v1/projects?owner=true');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('owner=true requires company persona', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .get('/api/v1/projects?owner=true')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('excludes deleted projects by default', async () => {
      const user = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'Active Project',
          shortDescription: 'Active',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: user.id,
          title: 'Deleted Project',
          shortDescription: 'Deleted',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app).get('/api/v1/projects');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Active Project');
    });

    test('includes deleted projects when owner=true and include_deleted=true', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

      await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Active Project',
          shortDescription: 'Active',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
        },
      });

      await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted Project',
          shortDescription: 'Deleted',
          description: 'Full description',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .get('/api/v1/projects?owner=true&include_deleted=true')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'company');

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
    });

    test('rejects include_deleted without owner filter', async () => {
      const res = await request(app).get('/api/v1/projects?include_deleted=true');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /projects/:projectId', () => {
    test('returns project details with task summary', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'TeamUp MVP',
          shortDescription: 'Build MVP for marketplace',
          description: 'Longer description',
          technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
          visibility: 'PUBLIC',
          status: 'ACTIVE',
          maxTalents: 3,
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Draft task',
          description: 'Draft',
          status: 'DRAFT',
        },
      });
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published task',
          description: 'Published',
          status: 'PUBLISHED',
        },
      });
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'In progress task',
          description: 'In progress',
          status: 'IN_PROGRESS',
        },
      });
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Completion requested',
          description: 'Awaiting review',
          status: 'COMPLETION_REQUESTED',
        },
      });
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Completed task',
          description: 'Completed',
          status: 'COMPLETED',
        },
      });
      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Closed task',
          description: 'Closed',
          status: 'CLOSED',
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        project_id: project.id,
        owner_user_id: owner.id,
        title: 'TeamUp MVP',
        short_description: 'Build MVP for marketplace',
        description: 'Longer description',
        technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        max_talents: 3,
        deleted_at: null,
        company: {
          user_id: owner.id,
          company_name: 'TeamUp Studio',
          verified: false,
          avg_rating: expect.any(Number),
          reviews_count: expect.any(Number),
        },
        tasks_summary: {
          total: 6,
          draft: 1,
          published: 1,
          in_progress: 2,
          completed: 1,
          closed: 1,
        },
      });
      expect(Number.isNaN(Date.parse(res.body.created_at))).toBe(false);
      expect(Number.isNaN(Date.parse(res.body.updated_at))).toBe(false);
    });

    test('rejects invalid projectId', async () => {
      const res = await request(app).get('/api/v1/projects/not-a-uuid');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'projectId',
            issue: 'Project id must be a valid UUID',
          }),
        ])
      );
    });

    test('returns 404 for deleted project without include_deleted', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted project',
          shortDescription: 'Deleted',
          description: 'Deleted',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('requires auth when include_deleted=true', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted project',
          shortDescription: 'Deleted',
          description: 'Deleted',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}?include_deleted=true`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('returns deleted project for owner when include_deleted=true', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted project',
          shortDescription: 'Deleted',
          description: 'Deleted',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}?include_deleted=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.project_id).toBe(project.id);
      expect(res.body.deleted_at).toEqual(expect.any(String));
    });

    test('returns 404 for deleted project when non-owner tries include_deleted=true', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
      const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted project',
          shortDescription: 'Deleted',
          description: 'Deleted',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}?include_deleted=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 404 for unlisted project when not owner', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Private project',
          shortDescription: 'Private',
          description: 'Private',
          technologies: ['Node.js'],
          visibility: 'UNLISTED',
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns unlisted project for owner when authenticated', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Private project',
          shortDescription: 'Private',
          description: 'Private',
          technologies: ['Node.js'],
          visibility: 'UNLISTED',
        },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.project_id).toBe(project.id);
      expect(res.body.visibility).toBe('UNLISTED');
    });

    test('returns 404 for non-existent project', async () => {
      const res = await request(app).get('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  test('POST /projects rejects unauthorized', async () => {
    const res = await request(app).post('/api/v1/projects').send(projectPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('POST /projects rejects invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', 'Bearer invalid')
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  test('POST /projects rejects missing company persona', async () => {
    const user = await createUser();
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PERSONA_NOT_AVAILABLE');
  });

  test('POST /projects rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ title: 'A', short_description: 'short', description: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          issue: 'Title must be at least 3 characters',
        }),
      ])
    );
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
      technologies: projectPayload.technologies,
      visibility: projectPayload.visibility,
      status: projectPayload.status,
      maxTalents: projectPayload.max_talents,
    });
  });

  test('POST /projects rejects duplicate title for same owner', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(projectPayload);

    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(projectPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PROJECT_TITLE_EXISTS');
  });

  test('PUT /projects/:projectId rejects unauthorized', async () => {
    const res = await request(app).put('/api/v1/projects/p1').send(updatePayload);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('PUT /projects/:projectId rejects invalid payload', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({ title: 'A', short_description: 'short', description: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'title',
          issue: 'Title must be at least 3 characters',
        }),
      ])
    );
  });

  test('PUT /projects/:projectId rejects missing project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .put('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(updatePayload);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('PUT /projects/:projectId rejects non-owner', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: projectPayload.title,
        shortDescription: projectPayload.short_description,
        description: projectPayload.description,
        technologies: projectPayload.technologies,
        visibility: projectPayload.visibility,
        status: projectPayload.status,
        maxTalents: projectPayload.max_talents,
      },
    });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(updatePayload);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('PUT /projects/:projectId updates project', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: owner.id, email: owner.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: projectPayload.title,
        shortDescription: projectPayload.short_description,
        description: projectPayload.description,
        technologies: projectPayload.technologies,
        visibility: projectPayload.visibility,
        status: projectPayload.status,
        maxTalents: projectPayload.max_talents,
      },
    });

    const res = await request(app)
      .put(`/api/v1/projects/${project.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send(updatePayload);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      project_id: project.id,
      updated: true,
      updated_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.updated_at))).toBe(false);

    const updated = await prisma.project.findUnique({ where: { id: project.id } });

    expect(updated).toMatchObject({
      ownerUserId: owner.id,
      title: updatePayload.title,
      shortDescription: updatePayload.short_description,
      description: updatePayload.description,
      technologies: updatePayload.technologies,
      visibility: updatePayload.visibility,
      status: updatePayload.status,
      maxTalents: updatePayload.max_talents,
    });
  });

  test('DELETE /projects/:projectId rejects unauthorized', async () => {
    const res = await request(app).delete('/api/v1/projects/p1');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  test('DELETE /projects/:projectId rejects invalid projectId', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/projects/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'projectId',
          issue: 'Project id must be a valid UUID',
        }),
      ])
    );
  });

  test('DELETE /projects/:projectId rejects missing project', async () => {
    const user = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: user.id, email: user.email });

    const res = await request(app)
      .delete('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  test('DELETE /projects/:projectId rejects non-owner', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const otherUser = await createUser({ companyProfile: { companyName: 'Other' } });
    const token = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: projectPayload.title,
        shortDescription: projectPayload.short_description,
        description: projectPayload.description,
        technologies: projectPayload.technologies,
        visibility: projectPayload.visibility,
        status: projectPayload.status,
        maxTalents: projectPayload.max_talents,
      },
    });

    const res = await request(app)
      .delete(`/api/v1/projects/${project.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_OWNER');
  });

  test('DELETE /projects/:projectId soft deletes project and tasks', async () => {
    const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
    const token = buildAccessToken({ userId: owner.id, email: owner.email });

    const project = await prisma.project.create({
      data: {
        ownerUserId: owner.id,
        title: projectPayload.title,
        shortDescription: projectPayload.short_description,
        description: projectPayload.description,
        technologies: projectPayload.technologies,
        visibility: projectPayload.visibility,
        status: projectPayload.status,
        maxTalents: projectPayload.max_talents,
      },
    });

    await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        projectId: project.id,
        title: 'Task A',
        description: 'First task',
      },
    });
    await prisma.task.create({
      data: {
        ownerUserId: owner.id,
        projectId: project.id,
        title: 'Task B',
        description: 'Second task',
      },
    });

    const res = await request(app)
      .delete(`/api/v1/projects/${project.id}`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      project_id: project.id,
      deleted_at: expect.any(String),
    });
    expect(Number.isNaN(Date.parse(res.body.deleted_at))).toBe(false);

    const deletedProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(deletedProject.deletedAt).not.toBeNull();
    expect(deletedProject.status).toBe('ARCHIVED');

    const tasks = await prisma.task.findMany({ where: { projectId: project.id } });
    expect(tasks).toHaveLength(2);
    for (const task of tasks) {
      expect(task.deletedAt).not.toBeNull();
      expect(task.status).toBe('DELETED');
    }
  });

  describe('POST /projects/:projectId/reports', () => {
    test('rejects unauthorized', async () => {
      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTH_REQUIRED');
    });

    test('rejects missing persona header', async () => {
      const user = await createUser();
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_REQUIRED');
    });

    test('rejects invalid persona header', async () => {
      const user = await createUser();
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'invalid')
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PERSONA_INVALID');
    });

    test('rejects invalid projectId', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/not-a-uuid/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'projectId',
            issue: 'Project id must be a valid UUID',
          }),
        ])
      );
    });

    test('rejects missing reason', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'reason',
            issue: 'Reason is required',
          }),
        ])
      );
    });

    test('rejects invalid reason', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'INVALID_REASON' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'reason',
            issue: 'Reason must be one of: SPAM, SCAM, INAPPROPRIATE_CONTENT, MISLEADING, OTHER',
          }),
        ])
      );
    });

    test('rejects comment exceeding max length', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM', comment: 'x'.repeat(1001) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'comment',
            issue: 'Comment must not exceed 1000 characters',
          }),
        ])
      );
    });

    test('returns 404 for non-existent project', async () => {
      const user = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: user.id, email: user.email });

      const res = await request(app)
        .post('/api/v1/projects/3fa85f64-5717-4562-b3fc-2c963f66afa6/reports')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('returns 404 for deleted project', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const reporter = await createUser({ developerProfile: { displayName: 'Test Dev' } });
      const token = buildAccessToken({ userId: reporter.id, email: reporter.email });

      const project = await prisma.project.create({
        data: {
          ownerUserId: owner.id,
          title: 'Deleted project',
          shortDescription: 'Deleted',
          description: 'Deleted',
          technologies: ['Node.js'],
          visibility: 'PUBLIC',
          deletedAt: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

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

    test('creates report without comment', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const reporter = await createUser({ companyProfile: { companyName: 'Other' } });
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
        .set('X-Persona', 'company')
        .send({ reason: 'SCAM' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        report_id: expect.any(String),
        created_at: expect.any(String),
      });

      const report = await prisma.projectReport.findUnique({
        where: { id: res.body.report_id },
      });

      expect(report).toMatchObject({
        projectId: project.id,
        reporterUserId: reporter.id,
        reporterPersona: 'company',
        reason: 'SCAM',
        comment: '',
      });
    });

    test('rejects duplicate report from same user', async () => {
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

      await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM' });

      const res = await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SCAM' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_REPORTED');
    });

    test('allows different users to report same project', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const reporter1 = await createUser({ developerProfile: { displayName: 'Reporter1' } });
      const reporter2 = await createUser({ companyProfile: { companyName: 'Reporter2' } });
      const token1 = buildAccessToken({ userId: reporter1.id, email: reporter1.email });
      const token2 = buildAccessToken({ userId: reporter2.id, email: reporter2.email });

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

      const res1 = await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token1}`)
        .set('X-Persona', 'developer')
        .send({ reason: 'SPAM' });

      expect(res1.status).toBe(201);

      const res2 = await request(app)
        .post(`/api/v1/projects/${project.id}/reports`)
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Persona', 'company')
        .send({ reason: 'SCAM' });

      expect(res2.status).toBe(201);

      const reports = await prisma.projectReport.findMany({
        where: { projectId: project.id },
      });
      expect(reports).toHaveLength(2);
      expect(reports[0].reporterPersona).toBe('developer');
      expect(reports[1].reporterPersona).toBe('company');
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

    test('project owner can see all tasks including drafts', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

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

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published Public Task',
          description: 'Published public task',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Draft Task',
          description: 'Draft task description',
          status: 'DRAFT',
          visibility: 'UNLISTED',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    test('non-owner authenticated user sees only public published tasks', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const otherUser = await createUser({ developerProfile: { displayName: 'Developer' } });
      const otherToken = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

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

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Published Public Task');
    });

    test('returns 404 for non-existent project', async () => {
      const res = await request(app).get(`/api/v1/projects/${randomUUID()}/tasks`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    test('owner can include deleted tasks', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

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

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Active Task',
          description: 'Active task description',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Deleted Task',
          description: 'Deleted task description',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
          deletedAt: new Date(),
        },
      });

      // Without include_deleted
      const res1 = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks`)
        .set('Authorization', `Bearer ${token}`);

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(1);
      expect(res1.body.total).toBe(1);

      // With include_deleted
      const res2 = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?include_deleted=true`)
        .set('Authorization', `Bearer ${token}`);

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(2);
      expect(res2.body.total).toBe(2);
    });

    test('non-owner cannot use include_deleted', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const otherUser = await createUser({ developerProfile: { displayName: 'Developer' } });
      const otherToken = buildAccessToken({ userId: otherUser.id, email: otherUser.email });

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

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?include_deleted=true`)
        .set('Authorization', `Bearer ${otherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_OWNER');
    });

    test('filters tasks by status', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp' } });
      const token = buildAccessToken({ userId: owner.id, email: owner.email });

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

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Published Task',
          description: 'Published task description',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
        },
      });

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

      const res = await request(app)
        .get(`/api/v1/projects/${project.id}/tasks?status=DRAFT`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe('Draft Task');
      expect(res.body.total).toBe(1);
    });

    test('supports pagination', async () => {
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

      // Create 5 tasks
      for (let i = 0; i < 5; i++) {
        await prisma.task.create({
          data: {
            ownerUserId: owner.id,
            projectId: project.id,
            title: `Task ${i + 1}`,
            description: `Task ${i + 1} description`,
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            category: 'BACKEND',
            type: 'PAID',
            difficulty: 'MIDDLE',
          },
        });
      }

      // Get first page
      const res1 = await request(app).get(`/api/v1/projects/${project.id}/tasks?page=1&size=2`);

      expect(res1.status).toBe(200);
      expect(res1.body.items).toHaveLength(2);
      expect(res1.body.page).toBe(1);
      expect(res1.body.size).toBe(2);
      expect(res1.body.total).toBe(5);

      // Get second page
      const res2 = await request(app).get(`/api/v1/projects/${project.id}/tasks?page=2&size=2`);

      expect(res2.status).toBe(200);
      expect(res2.body.items).toHaveLength(2);
      expect(res2.body.page).toBe(2);

      // Get third page
      const res3 = await request(app).get(`/api/v1/projects/${project.id}/tasks?page=3&size=2`);

      expect(res3.status).toBe(200);
      expect(res3.body.items).toHaveLength(1);
      expect(res3.body.page).toBe(3);
    });

    test('returns correct task response structure', async () => {
      const owner = await createUser({ companyProfile: { companyName: 'TeamUp Studio' } });

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

      await prisma.task.create({
        data: {
          ownerUserId: owner.id,
          projectId: project.id,
          title: 'Test Task',
          description: 'Test task description',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          category: 'BACKEND',
          type: 'PAID',
          difficulty: 'MIDDLE',
          requiredSkills: ['Node.js', 'PostgreSQL'],
        },
      });

      const res = await request(app).get(`/api/v1/projects/${project.id}/tasks`);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        items: expect.any(Array),
        page: expect.any(Number),
        size: expect.any(Number),
        total: expect.any(Number),
      });
      expect(res.body.items[0]).toMatchObject({
        task_id: expect.any(String),
        title: expect.any(String),
        status: expect.any(String),
        category: expect.any(String),
        type: expect.any(String),
        difficulty: expect.any(String),
        required_skills: expect.any(Array),
        project: expect.any(Object),
        company: expect.any(Object),
      });
      expect(res.body.items[0].company).toMatchObject({
        user_id: expect.any(String),
        company_name: expect.any(String),
      });
    });
  });
});
