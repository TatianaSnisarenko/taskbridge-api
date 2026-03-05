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
jest.unstable_mockModule(
  '../../src/services/technologies.service.js',
  () => technologiesServiceMock
);

const projectsService = await import('../../src/services/projects.service.js');

describe('projects.service', () => {
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

  describe('getProjects', () => {
    const mockProject = {
      id: 'p1',
      title: 'TeamUp MVP',
      shortDescription: 'Build MVP',
      technologies: [
        {
          isRequired: false,
          technology: {
            id: 'tech-1',
            slug: 'node-js',
            name: 'Node.js',
            type: 'BACKEND',
          },
        },
        {
          isRequired: false,
          technology: {
            id: 'tech-2',
            slug: 'prisma',
            name: 'Prisma',
            type: 'BACKEND',
          },
        },
      ],
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
        where: { deletedAt: null, visibility: 'PUBLIC', status: 'ACTIVE' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          technologies: {
            include: {
              technology: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
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
        where: { deletedAt: null, visibility: 'PUBLIC', status: 'ACTIVE' },
      });
      expect(result).toEqual({
        items: [
          {
            project_id: 'p1',
            title: 'TeamUp MVP',
            short_description: 'Build MVP',
            technologies: [
              {
                id: 'tech-1',
                slug: 'node-js',
                name: 'Node.js',
                type: 'BACKEND',
                is_required: false,
              },
              {
                id: 'tech-2',
                slug: 'prisma',
                name: 'Prisma',
                type: 'BACKEND',
                is_required: false,
              },
            ],
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

    test('ignores deprecated technology filter', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      await projectsService.getProjects({ userId: null, query: { technology: 'Prisma' } });

      expect(prismaMock.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            visibility: 'PUBLIC',
            status: 'ACTIVE',
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

  describe('getProjectById', () => {
    const mockProject = {
      id: 'p1',
      ownerUserId: 'u1',
      title: 'TeamUp MVP',
      shortDescription: 'Build MVP',
      description: 'Longer description',
      technologies: [
        {
          isRequired: false,
          technology: {
            id: 'tech-1',
            slug: 'node-js',
            name: 'Node.js',
            type: 'BACKEND',
          },
        },
        {
          isRequired: false,
          technology: {
            id: 'tech-2',
            slug: 'prisma',
            name: 'Prisma',
            type: 'BACKEND',
          },
        },
      ],
      visibility: 'PUBLIC',
      status: 'ACTIVE',
      maxTalents: 3,
      createdAt: new Date('2026-02-14T10:00:00Z'),
      updatedAt: new Date('2026-02-14T12:00:00Z'),
      deletedAt: null,
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

    test('returns project details with task summary', async () => {
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.task.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { _all: 1 } },
        { status: 'PUBLISHED', _count: { _all: 2 } },
        { status: 'IN_PROGRESS', _count: { _all: 1 } },
        { status: 'COMPLETION_REQUESTED', _count: { _all: 1 } },
        { status: 'COMPLETED', _count: { _all: 3 } },
        { status: 'CLOSED', _count: { _all: 2 } },
      ]);
      prismaMock.task.findMany.mockResolvedValue([]);

      const result = await projectsService.getProjectById({
        userId: null,
        projectId: 'p1',
        includeDeleted: false,
      });

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        include: {
          technologies: {
            include: {
              technology: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
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
      expect(prismaMock.task.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { projectId: 'p1', deletedAt: null },
        _count: { _all: true },
      });
      expect(result).toMatchObject({
        project_id: 'p1',
        owner_user_id: 'u1',
        title: 'TeamUp MVP',
        short_description: 'Build MVP',
        description: 'Longer description',
        technologies: [
          {
            id: 'tech-1',
            slug: 'node-js',
            name: 'Node.js',
            type: 'BACKEND',
            is_required: false,
          },
          {
            id: 'tech-2',
            slug: 'prisma',
            name: 'Prisma',
            type: 'BACKEND',
            is_required: false,
          },
        ],
        visibility: 'PUBLIC',
        status: 'ACTIVE',
        max_talents: 3,
        deleted_at: null,
        company: {
          user_id: 'u1',
          company_name: 'TeamUp Studio',
          verified: false,
          avg_rating: 4.6,
          reviews_count: 8,
        },
        tasks_summary: {
          total: 10,
          draft: 1,
          published: 2,
          in_progress: 2,
          completed: 3,
          closed: 2,
        },
      });
    });

    test('rejects missing project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        projectsService.getProjectById({
          userId: null,
          projectId: 'p1',
          includeDeleted: false,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted project without includeDeleted', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        ...mockProject,
        deletedAt: new Date('2026-02-14T13:00:00Z'),
      });

      await expect(
        projectsService.getProjectById({
          userId: null,
          projectId: 'p1',
          includeDeleted: false,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects unlisted project for non-owner', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        ...mockProject,
        visibility: 'UNLISTED',
      });

      await expect(
        projectsService.getProjectById({
          userId: 'u2',
          projectId: 'p1',
          includeDeleted: false,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('returns deleted project for owner when includeDeleted=true', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        ...mockProject,
        deletedAt: new Date('2026-02-14T13:00:00Z'),
      });
      prismaMock.task.groupBy.mockResolvedValue([]);
      prismaMock.task.findMany.mockResolvedValue([]);

      const result = await projectsService.getProjectById({
        userId: 'u1',
        projectId: 'p1',
        includeDeleted: true,
      });

      expect(prismaMock.task.groupBy).toHaveBeenCalledWith({
        by: ['status'],
        where: { projectId: 'p1' },
        _count: { _all: true },
      });
      expect(result.project_id).toBe('p1');
      expect(result.deleted_at).toEqual(expect.any(String));
    });

    test('includes tasks_preview with default 3 tasks', async () => {
      const mockTasks = [
        { id: 't1', title: 'Task 1', description: 'Description 1', status: 'PUBLISHED' },
        { id: 't2', title: 'Task 2', description: 'Description 2', status: 'PUBLISHED' },
        { id: 't3', title: 'Task 3', description: 'Description 3', status: 'PUBLISHED' },
      ];
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.task.groupBy.mockResolvedValue([{ status: 'PUBLISHED', _count: { _all: 5 } }]);
      prismaMock.task.findMany.mockResolvedValue(mockTasks);

      const result = await projectsService.getProjectById({
        userId: null,
        projectId: 'p1',
        includeDeleted: false,
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'p1',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 3,
      });
      expect(result.tasks_preview).toHaveLength(3);
      expect(result.tasks_preview[0]).toMatchObject({
        id: 't1',
        title: 'Task 1',
        description: 'Description 1',
      });
    });

    test('respects custom previewLimit parameter', async () => {
      const mockTasks = [
        { id: 't1', title: 'Task 1', description: 'Description 1', status: 'PUBLISHED' },
        { id: 't2', title: 'Task 2', description: 'Description 2', status: 'PUBLISHED' },
      ];
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.task.groupBy.mockResolvedValue([{ status: 'PUBLISHED', _count: { _all: 5 } }]);
      prismaMock.task.findMany.mockResolvedValue(mockTasks);

      const result = await projectsService.getProjectById({
        userId: null,
        projectId: 'p1',
        includeDeleted: false,
        previewLimit: '2',
      });

      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'p1',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 2,
      });
      expect(result.tasks_preview).toHaveLength(2);
    });

    test('owner sees all tasks in preview without status filter', async () => {
      const mockTasks = [
        { id: 't1', title: 'Draft Task', description: 'Draft description', status: 'DRAFT' },
        {
          id: 't2',
          title: 'Published Task',
          description: 'Published description',
          status: 'PUBLISHED',
        },
      ];
      prismaMock.project.findUnique.mockResolvedValue(mockProject);
      prismaMock.task.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { _all: 1 } },
        { status: 'PUBLISHED', _count: { _all: 1 } },
      ]);
      prismaMock.task.findMany.mockResolvedValue(mockTasks);

      const result = await projectsService.getProjectById({
        userId: 'u1', // Owner
        projectId: 'p1',
        includeDeleted: false,
      });

      // Owner should not have status filter applied
      expect(prismaMock.task.findMany).toHaveBeenCalledWith({
        where: {
          projectId: 'p1',
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        take: 3,
      });
      expect(result.tasks_preview).toHaveLength(2);
    });
  });

  describe('reportProject', () => {
    test('creates report successfully', async () => {
      const createdAt = new Date('2026-02-14T12:40:00Z');
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockResolvedValue({
        id: 'r1',
        createdAt,
      });

      const result = await projectsService.reportProject({
        userId: 'u1',
        persona: 'developer',
        projectId: 'p1',
        report: { reason: 'SPAM', comment: 'This is spam' },
      });

      expect(prismaMock.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'p1' },
        select: { id: true, deletedAt: true },
      });
      expect(prismaMock.projectReport.create).toHaveBeenCalledWith({
        data: {
          projectId: 'p1',
          reporterUserId: 'u1',
          reporterPersona: 'developer',
          reason: 'SPAM',
          comment: 'This is spam',
        },
        select: { id: true, createdAt: true },
      });
      expect(result).toEqual({ reportId: 'r1', createdAt });
    });

    test('creates report with empty comment when not provided', async () => {
      const createdAt = new Date('2026-02-14T12:40:00Z');
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockResolvedValue({
        id: 'r1',
        createdAt,
      });

      const result = await projectsService.reportProject({
        userId: 'u1',
        persona: 'company',
        projectId: 'p1',
        report: { reason: 'SCAM' },
      });

      expect(prismaMock.projectReport.create).toHaveBeenCalledWith({
        data: {
          projectId: 'p1',
          reporterUserId: 'u1',
          reporterPersona: 'company',
          reason: 'SCAM',
          comment: '',
        },
        select: { id: true, createdAt: true },
      });
      expect(result).toEqual({ reportId: 'r1', createdAt });
    });

    test('rejects missing project', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects deleted project', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: new Date('2026-02-14T13:00:00Z'),
      });

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    test('rejects duplicate report (unique constraint violation)', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      prismaMock.projectReport.create.mockRejectedValue({
        code: 'P2002',
      });

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_REPORTED',
      });
    });

    test('rethrows other database errors', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p1',
        deletedAt: null,
      });
      const dbError = new Error('Database error');
      prismaMock.projectReport.create.mockRejectedValue(dbError);

      await expect(
        projectsService.reportProject({
          userId: 'u1',
          persona: 'developer',
          projectId: 'p1',
          report: { reason: 'SPAM' },
        })
      ).rejects.toEqual(dbError);
    });
  });
});
