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
  },
  $transaction: jest.fn((ops) => Promise.all(ops)),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const projectsService = await import('../../src/services/projects.service.js');

describe('projects.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createProject creates project', async () => {
    const createdAt = new Date('2026-02-14T10:00:00Z');
    prismaMock.project.findFirst.mockResolvedValue(null);
    prismaMock.project.create.mockResolvedValue({ id: 'p1', createdAt });

    const project = {
      title: 'TeamUp MVP',
      short_description: 'Build MVP for marketplace',
      description: 'Longer description for the marketplace project',
      technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
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
        technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 3,
      },
      select: { id: true, createdAt: true },
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
      technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
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
        technologies: ['Node.js', 'PostgreSQL', 'Prisma'],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        maxTalents: 5,
      },
      select: { id: true, updatedAt: true },
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
      data: { deletedAt: expect.any(Date), status: 'CLOSED' },
    });
    expect(result).toEqual({ projectId: 'p1', deletedAt });
  });

  describe('getProjects', () => {
    const mockProject = {
      id: 'p1',
      title: 'TeamUp MVP',
      shortDescription: 'Build MVP',
      technologies: ['Node.js', 'Prisma'],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      maxTalents: 3,
      createdAt: new Date('2026-02-14T10:00:00Z'),
      owner: {
        id: 'u1',
        companyProfile: {
          companyName: 'TeamUp Studio',
          verified: false,
          avgRating: 4.6,
          reviewsCount: 8,
        },
      },
    };

    test('returns public projects by default', async () => {
      prismaMock.$transaction.mockResolvedValue([[mockProject], 1]);

      const result = await projectsService.getProjects({ userId: null, query: {} });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null, visibility: 'PUBLIC' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              id: true,
              companyProfile: {
                select: {
                  companyName: true,
                  verified: true,
                  avgRating: true,
                  reviewsCount: true,
                },
              },
            },
          },
        },
      });
      expect(prismaMock.project.count).toHaveBeenCalledWith({
        where: { deletedAt: null, visibility: 'PUBLIC' },
      });
      expect(result).toEqual({
        items: [
          {
            project_id: 'p1',
            title: 'TeamUp MVP',
            short_description: 'Build MVP',
            technologies: ['Node.js', 'Prisma'],
            visibility: 'PUBLIC',
            status: 'ACTIVE',
            max_talents: 3,
            created_at: '2026-02-14T10:00:00.000Z',
            company: {
              user_id: 'u1',
              company_name: 'TeamUp Studio',
              verified: false,
              avg_rating: 4.6,
              reviews_count: 8,
            },
          },
        ],
        page: 1,
        size: 20,
        total: 1,
      });
    });

    test('filters by search', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({ userId: null, query: { search: 'teamup' } });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: 'teamup', mode: 'insensitive' } },
              { shortDescription: { contains: 'teamup', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    test('filters by technology', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({ userId: null, query: { technology: 'Prisma' } });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            technologies: { hasSome: ['Prisma'] },
          }),
        })
      );
    });

    test('supports pagination', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({ userId: null, query: { page: 2, size: 10 } });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });

    test('filters by owner', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({ userId: 'u1', query: { owner: true } });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerUserId: 'u1',
          }),
        })
      );
    });

    test('include_deleted requires owner filter', async () => {
      await expect(
        projectsService.getProjects({ userId: null, query: { include_deleted: true } })
      ).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN',
      });
    });

    test('includes deleted when owner=true and include_deleted=true', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({
        userId: 'u1',
        query: { owner: true, include_deleted: true },
      });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            deletedAt: null,
          }),
        })
      );
    });
  });
});
