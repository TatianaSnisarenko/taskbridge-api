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

describe('me.service - applications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getMyApplications', () => {
    test('rejects when developer profile is missing', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue(null);

      await expect(
        meService.getMyApplications({ userId: 'u1', page: 1, size: 20 })
      ).rejects.toMatchObject({
        status: 403,
        code: 'PERSONA_NOT_AVAILABLE',
      });
    });

    test('returns paginated applications with task and company info', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });

      const createdAt = new Date('2026-02-15T10:00:00Z');

      prismaMock.application.findMany.mockResolvedValue([
        {
          id: 'app1',
          status: 'PENDING',
          createdAt,
          task: {
            id: 't1',
            title: 'Backend Developer',
            status: 'PUBLISHED',
            deadline: new Date('2026-08-20'),
            project: {
              id: 'p1',
              title: 'E-commerce Platform',
            },
            owner: {
              id: 'c1',
              companyProfile: {
                companyName: 'Tech Corp',
              },
            },
          },
        },
      ]);
      prismaMock.application.count.mockResolvedValue(25);

      const result = await meService.getMyApplications({
        userId: 'u1',
        page: 2,
        size: 10,
      });

      expect(result.page).toBe(2);
      expect(result.size).toBe(10);
      expect(result.total).toBe(25);
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        application_id: 'app1',
        status: 'PENDING',
        created_at: createdAt.toISOString(),
        task: {
          task_id: 't1',
          title: 'Backend Developer',
          status: 'PUBLISHED',
          deadline: '2026-08-20',
          project: {
            project_id: 'p1',
            title: 'E-commerce Platform',
          },
        },
        company: {
          user_id: 'c1',
          company_name: 'Tech Corp',
        },
      });
    });

    test('applies pagination correctly', async () => {
      prismaMock.developerProfile.findUnique.mockResolvedValue({ userId: 'u1' });
      prismaMock.application.findMany.mockResolvedValue([]);
      prismaMock.application.count.mockResolvedValue(0);

      const result = await meService.getMyApplications({
        userId: 'u1',
        page: 3,
        size: 15,
      });

      expect(prismaMock.application.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 30, // (3-1) * 15
          take: 15,
        })
      );
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
