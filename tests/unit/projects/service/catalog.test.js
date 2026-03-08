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

describe('projects.service - catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.projectTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.projectTechnology.deleteMany.mockResolvedValue({ count: 0 });
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
});
