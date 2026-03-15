import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: {
    findUnique: jest.fn(),
  },
  task: {
    findUnique: jest.fn(),
  },
  taskFavorite: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const { addFavoriteTask, removeFavoriteTask, getMyFavoriteTasks } =
  await import('../../../../src/services/me/favorites.js');

describe('me.service - favorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addFavoriteTask', () => {
    test('rejects when developer profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(addFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('rejects when task does not exist', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.task.findUnique.mockResolvedValue(null);

      await expect(addFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'TASK_NOT_FOUND',
      });
    });

    test('rejects when task is soft-deleted', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't1',
        deletedAt: new Date('2026-03-01T00:00:00Z'),
      });

      await expect(addFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'TASK_NOT_FOUND',
      });
    });

    test('rejects when task is already favorited', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.task.findUnique.mockResolvedValue({ id: 't1', deletedAt: null });
      prismaMock.taskFavorite.findUnique.mockResolvedValue({ id: 'fav1' });

      await expect(addFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 409,
        code: 'ALREADY_FAVORITED',
      });
    });

    test('creates favorite and returns mapped response', async () => {
      const savedAt = new Date('2026-03-10T12:00:00Z');
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.task.findUnique.mockResolvedValue({ id: 't1', deletedAt: null });
      prismaMock.taskFavorite.findUnique.mockResolvedValue(null);
      prismaMock.taskFavorite.create.mockResolvedValue({
        id: 'fav1',
        taskId: 't1',
        createdAt: savedAt,
      });

      const result = await addFavoriteTask({ userId: 'u1', taskId: 't1' });

      expect(prismaMock.taskFavorite.create).toHaveBeenCalledWith({
        data: { userId: 'u1', taskId: 't1' },
        select: { id: true, taskId: true, createdAt: true },
      });

      expect(result).toEqual({
        favorite_id: 'fav1',
        task_id: 't1',
        saved_at: savedAt.toISOString(),
      });
    });
  });

  describe('removeFavoriteTask', () => {
    test('rejects when developer profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(removeFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('rejects when favorite does not exist', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findUnique.mockResolvedValue(null);

      await expect(removeFavoriteTask({ userId: 'u1', taskId: 't1' })).rejects.toMatchObject({
        status: 404,
        code: 'FAVORITE_NOT_FOUND',
      });
    });

    test('deletes favorite and returns removed response', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findUnique.mockResolvedValue({ id: 'fav1' });
      prismaMock.taskFavorite.delete.mockResolvedValue({});

      const result = await removeFavoriteTask({ userId: 'u1', taskId: 't1' });

      expect(prismaMock.taskFavorite.delete).toHaveBeenCalledWith({
        where: { userId_taskId: { userId: 'u1', taskId: 't1' } },
      });

      expect(result).toEqual({ task_id: 't1', removed: true });
    });
  });

  describe('getMyFavoriteTasks', () => {
    test('rejects when developer profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(getMyFavoriteTasks({ userId: 'u1', page: 1, size: 20 })).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns empty paginated response when no favorites', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findMany.mockResolvedValue([]);
      prismaMock.taskFavorite.count.mockResolvedValue(0);

      const result = await getMyFavoriteTasks({ userId: 'u1', page: 1, size: 20 });

      expect(result).toEqual({ items: [], page: 1, size: 20, total: 0 });
    });

    test('returns paginated list with mapped task and company info', async () => {
      const createdAt = new Date('2026-03-10T12:00:00Z');
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findMany.mockResolvedValue([
        {
          id: 'fav1',
          createdAt,
          task: {
            id: 't1',
            title: 'Build REST API',
            status: 'PUBLISHED',
            category: 'BACKEND',
            difficulty: 'MIDDLE',
            type: 'PAID',
            deadline: new Date('2026-08-15'),
            deletedAt: null,
            ownerUserId: 'c1',
            owner: {
              companyProfile: {
                companyName: 'NovaTech Labs',
                verified: true,
              },
            },
          },
        },
      ]);
      prismaMock.taskFavorite.count.mockResolvedValue(1);

      const result = await getMyFavoriteTasks({ userId: 'u1', page: 1, size: 20 });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        favorite_id: 'fav1',
        saved_at: createdAt.toISOString(),
        task: {
          task_id: 't1',
          title: 'Build REST API',
          status: 'PUBLISHED',
          category: 'BACKEND',
          difficulty: 'MIDDLE',
          type: 'PAID',
          deadline: '2026-08-15',
          is_deleted: false,
          company: {
            user_id: 'c1',
            company_name: 'NovaTech Labs',
            verified: true,
          },
        },
      });
    });

    test('marks task as deleted when deletedAt is set', async () => {
      const createdAt = new Date('2026-03-10T12:00:00Z');
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findMany.mockResolvedValue([
        {
          id: 'fav2',
          createdAt,
          task: {
            id: 't2',
            title: 'Deleted task',
            status: 'DELETED',
            category: null,
            difficulty: null,
            type: 'VOLUNTEER',
            deadline: null,
            deletedAt: new Date('2026-03-05T00:00:00Z'),
            ownerUserId: 'c2',
            owner: {
              companyProfile: null,
            },
          },
        },
      ]);
      prismaMock.taskFavorite.count.mockResolvedValue(1);

      const result = await getMyFavoriteTasks({ userId: 'u1' });

      expect(result.items[0].task.is_deleted).toBe(true);
      expect(result.items[0].task.company.company_name).toBeNull();
      expect(result.items[0].task.company.verified).toBe(false);
    });

    test('uses correct skip for pagination', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findMany.mockResolvedValue([]);
      prismaMock.taskFavorite.count.mockResolvedValue(0);

      await getMyFavoriteTasks({ userId: 'u1', page: 3, size: 10 });

      expect(prismaMock.taskFavorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });

    test('defaults page to 1 and size to 20 when not provided', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.taskFavorite.findMany.mockResolvedValue([]);
      prismaMock.taskFavorite.count.mockResolvedValue(0);

      const result = await getMyFavoriteTasks({ userId: 'u1' });

      expect(result.page).toBe(1);
      expect(result.size).toBe(20);
    });
  });
});
