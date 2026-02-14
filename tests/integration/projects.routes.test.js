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
