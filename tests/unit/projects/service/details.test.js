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

describe('projects.service - details', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.projectTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.projectTechnology.deleteMany.mockResolvedValue({ count: 0 });
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
      deadline: new Date('2026-12-01'),
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
        deadline: '2026-12-01',
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
});
