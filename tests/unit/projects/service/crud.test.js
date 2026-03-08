import { jest } from '@jest/globals';

const prismaMock = {
  project: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  task: {
    updateMany: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  projectReport: {
    create: jest.fn(),
  },
  projectTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((arg) => {
    if (typeof arg === 'function') {
      return arg(prismaMock);
    }

    return Promise.all(arg);
  }),
};

const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const projectsService = await import('../../../../src/services/projects/index.js');

describe('projects.service - crud', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.projectTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.projectTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  test('createProject creates project', async () => {
    const createdAt = new Date('2026-02-14T10:00:00Z');
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.create.mockResolvedValue({ id: 'p1', createdAt });

    const project = {
      title: 'TeamUp MVP',
      short_description: 'Build MVP for marketplace',
      description: 'Longer description for the marketplace project',
      technology_ids: ['tech-1', 'tech-2'],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      max_talents: 3,
    };

    const result = await projectsService.createProject({ userId: 'u1', project });

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({
      where: { ownerUserId: 'u1', title: 'TeamUp MVP' },
      select: { id: true },
    });
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        ownerUserId: 'u1',
        title: 'TeamUp MVP',
        shortDescription: 'Build MVP for marketplace',
        description: 'Longer description for the marketplace project',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 3,
      },
      select: { id: true, createdAt: true },
    });
    expect(prismaMock.projectTechnology.createMany).toHaveBeenCalledWith({
      data: [
        { projectId: 'p1', technologyId: 'tech-1', isRequired: false },
        { projectId: 'p1', technologyId: 'tech-2', isRequired: false },
      ],
      skipDuplicates: true,
    });

    expect(result).toEqual({ projectId: 'p1', createdAt });
  });

  test('createProject rejects duplicate title for owner', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: 'p1' });

    await expect(
      projectsService.createProject({
        userId: 'u1',
        project: { title: 'TeamUp MVP' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_TITLE_EXISTS',
    });
  });

  test('updateProject rejects missing project', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      projectsService.updateProject({
        userId: 'u1',
        projectId: 'p1',
        project: { title: 'TeamUp MVP' },
      })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('updateProject rejects non-owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u2' });

    await expect(
      projectsService.updateProject({
        userId: 'u1',
        projectId: 'p1',
        project: { title: 'TeamUp MVP' },
      })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('updateProject rejects duplicate title for owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u1' });
    prismaMock.project.findFirst.mockResolvedValue({ id: 'p2' });

    await expect(
      projectsService.updateProject({
        userId: 'u1',
        projectId: 'p1',
        project: { title: 'TeamUp MVP' },
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'PROJECT_TITLE_EXISTS',
    });
  });

  test('updateProject updates project', async () => {
    const updatedAt = new Date('2026-02-14T12:00:00Z');
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u1' });
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.update.mockResolvedValue({ id: 'p1', updatedAt });

    const project = {
      title: 'TeamUp MVP',
      short_description: 'Updated short',
      description: 'Updated long description',
      technology_ids: ['tech-1', 'tech-2'],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      max_talents: 5,
    };

    const result = await projectsService.updateProject({
      userId: 'u1',
      projectId: 'p1',
      project,
    });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: {
        title: 'TeamUp MVP',
        shortDescription: 'Updated short',
        description: 'Updated long description',
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 5,
      },
      select: { id: true, updatedAt: true },
    });
    expect(prismaMock.projectTechnology.deleteMany).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
    });
    expect(prismaMock.projectTechnology.createMany).toHaveBeenCalledWith({
      data: [
        { projectId: 'p1', technologyId: 'tech-1', isRequired: false },
        { projectId: 'p1', technologyId: 'tech-2', isRequired: false },
      ],
      skipDuplicates: true,
    });

    expect(result).toEqual({ projectId: 'p1', updated: true, updatedAt });
  });

  test('deleteProject rejects missing project', async () => {
    prismaMock.project.findUnique.mockResolvedValue(null);

    await expect(
      projectsService.deleteProject({ userId: 'u1', projectId: 'p1' })
    ).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('deleteProject rejects non-owner', async () => {
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u2' });

    await expect(
      projectsService.deleteProject({ userId: 'u1', projectId: 'p1' })
    ).rejects.toMatchObject({
      status: 403,
      code: 'NOT_OWNER',
    });
  });

  test('deleteProject soft deletes project and tasks', async () => {
    const deletedAt = new Date('2026-02-14T12:30:00Z');
    prismaMock.project.findUnique.mockResolvedValue({ id: 'p1', ownerUserId: 'u1' });
    prismaMock.project.update.mockResolvedValue({ id: 'p1', deletedAt });
    prismaMock.task.updateMany.mockResolvedValue({ count: 2 });

    const result = await projectsService.deleteProject({ userId: 'u1', projectId: 'p1' });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { deletedAt: expect.any(Date), status: 'ARCHIVED' },
      select: { id: true, deletedAt: true },
    });
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { projectId: 'p1', deletedAt: null },
      data: { deletedAt: expect.any(Date), status: 'DELETED' },
    });
    expect(result).toEqual({ projectId: 'p1', deletedAt });
  });
});
