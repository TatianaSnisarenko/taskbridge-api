import { jest } from '@jest/globals';

const prismaMock = {
  task: {
    findUnique: jest.fn(),
  },
  taskInvite: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  developerProfile: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const invitesCatalogService = await import('../../src/services/invites/catalog.js');

describe('invites.catalog.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTaskInvites', () => {
    test('throws TASK_NOT_FOUND when task is missing', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(
        invitesCatalogService.getTaskInvites({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 404,
        code: 'TASK_NOT_FOUND',
      });
    });

    test('throws NOT_OWNER when requester is not task owner', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'c2',
        deletedAt: null,
      });

      await expect(
        invitesCatalogService.getTaskInvites({ userId: 'c1', taskId: 't1' })
      ).rejects.toMatchObject({
        status: 403,
        code: 'NOT_OWNER',
      });
    });

    test('returns paginated task invites and applies status filter', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        ownerUserId: 'c1',
        deletedAt: null,
      });

      const createdAt = new Date('2026-03-01T10:00:00Z');
      const respondedAt = new Date('2026-03-02T10:00:00Z');

      prismaMock.taskInvite.findMany.mockResolvedValue([
        {
          id: 'inv1',
          status: 'ACCEPTED',
          message: 'Join us',
          createdAt,
          respondedAt,
          developer: {
            id: 'd1',
            developerProfile: {
              displayName: 'Dev One',
              jobTitle: 'Backend Engineer',
              avatarUrl: 'https://cdn.example.com/avatar.webp',
            },
          },
        },
      ]);
      prismaMock.taskInvite.count.mockResolvedValue(1);

      const result = await invitesCatalogService.getTaskInvites({
        userId: 'c1',
        taskId: 't1',
        page: 2,
        size: 10,
        status: 'ACCEPTED',
      });

      expect(prismaMock.taskInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taskId: 't1', status: 'ACCEPTED' },
          skip: 10,
          take: 10,
        })
      );

      expect(result).toEqual({
        items: [
          {
            invite_id: 'inv1',
            status: 'ACCEPTED',
            message: 'Join us',
            created_at: createdAt.toISOString(),
            responded_at: respondedAt.toISOString(),
            developer: {
              user_id: 'd1',
              display_name: 'Dev One',
              primary_role: 'Backend Engineer',
              avatar_url: 'https://cdn.example.com/avatar.webp',
            },
          },
        ],
        page: 2,
        size: 10,
        total: 1,
      });
    });
  });

  describe('getMyInvites', () => {
    test('throws PERSONA_NOT_AVAILABLE when developer profile does not exist', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(invitesCatalogService.getMyInvites({ userId: 'd1' })).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns paginated invites and maps null avg rating', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'd1' });

      const createdAt = new Date('2026-03-01T10:00:00Z');

      prismaMock.taskInvite.findMany.mockResolvedValue([
        {
          id: 'inv1',
          status: 'PENDING',
          message: 'We like your profile',
          createdAt,
          respondedAt: null,
          task: {
            id: 't1',
            title: 'Build API',
            category: 'BACKEND',
            difficulty: 'MIDDLE',
            type: 'FEATURE_IMPLEMENTATION',
          },
          company: {
            id: 'c1',
            companyProfile: {
              companyName: 'TeamUp',
              verified: true,
              avgRating: null,
              reviewsCount: 4,
            },
          },
        },
      ]);
      prismaMock.taskInvite.count.mockResolvedValue(1);

      const result = await invitesCatalogService.getMyInvites({
        userId: 'd1',
        page: 1,
        size: 20,
      });

      expect(result.items[0]).toEqual({
        invite_id: 'inv1',
        status: 'PENDING',
        message: 'We like your profile',
        created_at: createdAt.toISOString(),
        responded_at: null,
        task: {
          task_id: 't1',
          title: 'Build API',
          category: 'BACKEND',
          difficulty: 'MIDDLE',
          type: 'FEATURE_IMPLEMENTATION',
        },
        company: {
          user_id: 'c1',
          company_name: 'TeamUp',
          verified: true,
          avg_rating: null,
          reviews_count: 4,
        },
      });
    });

    test('applies status filter and converts avg rating to number', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'd1' });
      prismaMock.taskInvite.findMany.mockResolvedValue([
        {
          id: 'inv2',
          status: 'ACCEPTED',
          message: 'Welcome aboard',
          createdAt: new Date('2026-03-03T12:00:00Z'),
          respondedAt: new Date('2026-03-03T13:00:00Z'),
          task: {
            id: 't2',
            title: 'Frontend polish',
            category: 'FRONTEND',
            difficulty: 'SENIOR',
            type: 'BUG_FIX',
          },
          company: {
            id: 'c2',
            companyProfile: {
              companyName: 'Acme',
              verified: false,
              avgRating: '4.7',
              reviewsCount: 9,
            },
          },
        },
      ]);
      prismaMock.taskInvite.count.mockResolvedValue(1);

      await invitesCatalogService.getMyInvites({ userId: 'd1', status: 'ACCEPTED' });

      expect(prismaMock.taskInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { developerUserId: 'd1', status: 'ACCEPTED' } })
      );
    });
  });
});
