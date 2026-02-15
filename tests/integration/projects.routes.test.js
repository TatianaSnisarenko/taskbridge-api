import { jest } from '@jest/globals';
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
      expect(task.status).toBe('CLOSED');
    }
  });
});
