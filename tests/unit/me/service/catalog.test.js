import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  application: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../../../src/services/me/index.js');

describe('me.service - catalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyTasks rejects when developer profile is missing', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(meService.getMyTasks({ userId: 'u1', page: 1, size: 20 })).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  test('getMyTasks returns tasks with default status filter', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    const publishedAt = new Date('2026-02-10T10:00:00Z');
    const completedAt = new Date('2026-02-12T10:00:00Z');

    prismaMock.task.findMany.mockResolvedValue([
      {
        id: 't1',
        title: 'Task A',
        status: 'COMPLETED',
        publishedAt,
        completedAt,
        project: { id: 'p1', title: 'Project' },
        ownerUserId: 'c1',
        owner: {
          companyProfile: {
            companyName: 'Company',
            verified: false,
            avgRating: 4.6,
            reviewsCount: 3,
          },
        },
      },
    ]);
    prismaMock.task.count.mockResolvedValue(1);

    const result = await meService.getMyTasks({ userId: 'u1', page: 1, size: 20 });

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['IN_PROGRESS', 'DISPUTE', 'COMPLETION_REQUESTED', 'COMPLETED'] },
        }),
        orderBy: { updatedAt: 'desc' },
      })
    );

    expect(result).toEqual({
      items: [
        {
          task_id: 't1',
          title: 'Task A',
          status: 'COMPLETED',
          published_at: publishedAt.toISOString(),
          completed_at: completedAt.toISOString(),
          project: { project_id: 'p1', title: 'Project' },
          company: {
            user_id: 'c1',
            company_name: 'Company',
            verified: false,
            avg_rating: 4.6,
            reviews_count: 3,
          },
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });

  test('getMyTasks applies status filter when provided', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
    prismaMock.task.findMany.mockResolvedValue([]);
    prismaMock.task.count.mockResolvedValue(0);

    await meService.getMyTasks({ userId: 'u1', page: 1, size: 20, status: 'IN_PROGRESS' });

    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'IN_PROGRESS',
        }),
      })
    );
  });

  test('getMyProjects rejects when developer profile is missing', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue(null);

    await expect(
      meService.getMyProjects({ userId: 'u1', persona: 'developer', page: 1, size: 20 })
    ).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  test('getMyProjects returns worked projects for developer persona', async () => {
    prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

    const createdAt = new Date('2026-02-10T10:00:00Z');
    const updatedAt = new Date('2026-02-11T10:00:00Z');

    prismaMock.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        ownerUserId: 'c1',
        title: 'Archived Project',
        shortDescription: 'Archived short',
        status: 'ARCHIVED',
        visibility: 'PUBLIC',
        maxTalents: 8,
        createdAt,
        updatedAt,
        owner: {
          id: 'c1',
          companyProfile: {
            companyName: 'Company',
            verified: false,
            avgRating: 4.2,
            reviewsCount: 5,
          },
        },
      },
    ]);
    prismaMock.project.count.mockResolvedValue(1);

    const result = await meService.getMyProjects({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          tasks: {
            some: {
              deletedAt: null,
              applications: {
                some: {
                  developerUserId: 'u1',
                  status: 'ACCEPTED',
                },
              },
            },
          },
        }),
        orderBy: { updatedAt: 'desc' },
      })
    );

    expect(result).toEqual({
      items: [
        {
          project_id: 'p1',
          owner_user_id: 'c1',
          title: 'Archived Project',
          short_description: 'Archived short',
          status: 'ARCHIVED',
          visibility: 'PUBLIC',
          max_talents: 8,
          created_at: createdAt.toISOString(),
          updated_at: updatedAt.toISOString(),
          company: {
            user_id: 'c1',
            company_name: 'Company',
            verified: false,
            avg_rating: 4.2,
            reviews_count: 5,
          },
        },
      ],
      page: 1,
      size: 20,
      total: 1,
    });
  });

  test('getMyProjects rejects non-developer persona', async () => {
    await expect(
      meService.getMyProjects({ userId: 'c1', persona: 'company', page: 1, size: 20 })
    ).rejects.toMatchObject({
      status: 403,
      code: 'PERSONA_NOT_AVAILABLE',
    });
  });

  describe('getMyTasks - branch coverage', () => {
    // In me/catalog.js, default status filter uses array instead of explicit filter
    test('getMyTasks uses default status array when status not provided', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
      });

      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 't1',
          title: 'Task 1',
          status: 'IN_PROGRESS',
          publishedAt: new Date('2026-03-01T10:00:00Z'),
          completedAt: null,
          project: { id: 'p1', title: 'Project 1' },
          ownerUserId: 'c1',
          owner: {
            companyProfile: {
              companyName: 'Corp',
              verified: true,
              avgRating: null,
              reviewsCount: 0,
            },
          },
        },
      ]);
      prismaMock.task.count.mockResolvedValue(1);

      await meService.getMyTasks({ userId: 'u1', page: 1, size: 20 });

      // Should use default allowed statuses
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: expect.arrayContaining([
                'IN_PROGRESS',
                'DISPUTE',
                'COMPLETION_REQUESTED',
                'COMPLETED',
              ]),
            },
          }),
        })
      );
    });

    test('getMyTasks applies explicit status filter when provided', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({
        userId: 'u1',
      });

      prismaMock.task.findMany.mockResolvedValue([]);
      prismaMock.task.count.mockResolvedValue(0);

      await meService.getMyTasks({ userId: 'u1', page: 1, size: 20, status: 'COMPLETED' });

      // Should use provided status filter
      expect(prismaMock.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });
  });

  describe('getMyProjects - branch coverage', () => {
    test('getMyProjects rejects non-developer persona before checking profile', async () => {
      // In me/catalog.js, persona check happens before profile check
      await expect(
        meService.getMyProjects({
          userId: 'u1',
          persona: 'company',
          page: 1,
          size: 20,
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });

      // developerProfile should NOT be checked because persona check fails first
      expect(prismaMock.developerProfile.findUnique).not.toHaveBeenCalled();
    });

    test('getMyProjects checks developer profile exists after persona check', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        meService.getMyProjects({
          userId: 'u1',
          persona: 'developer',
          page: 1,
          size: 20,
        })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });

      // Now developerProfile should be checked
      expect(prismaMock.developerProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        select: { userId: true },
      });
    });
  });
});
