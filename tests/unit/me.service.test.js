import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const meService = await import('../../src/services/me.service.js');

describe('me.service', () => {
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
          status: { in: ['IN_PROGRESS', 'COMPLETION_REQUESTED', 'COMPLETED'] },
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
});
