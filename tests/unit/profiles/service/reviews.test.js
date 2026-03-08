import { jest } from '@jest/globals';

const prismaMock = {
  $transaction: jest.fn(),
  developerProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  companyProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  review: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  task: {
    count: jest.fn(),
    findMany: jest.fn(),
  },
  project: {
    count: jest.fn(),
  },
  developerTechnology: {
    createMany: jest.fn(),
    deleteMany: jest.fn(),
    findMany: jest.fn(),
  },
};

// Mock cloudinary utilities
const cloudinaryMock = {
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
};

// Mock sharp
const sharpMock = jest.fn();

// Mock technologies service
const technologiesServiceMock = {
  validateTechnologyIds: jest.fn(async (ids) => ids),
  incrementTechnologyPopularity: jest.fn(async () => {}),
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/utils/cloudinary.js', () => cloudinaryMock);
jest.unstable_mockModule('sharp', () => ({ default: sharpMock }));
jest.unstable_mockModule('../../src/services/technologies/index.js', () => technologiesServiceMock);

const profilesService = await import('../../../../src/services/profiles/index.js');

describe('profiles.service - reviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Configure $transaction to actually call the callback function
    prismaMock.$transaction.mockImplementation(async (callback) => {
      return await callback(prismaMock);
    });
    prismaMock.developerTechnology.createMany.mockResolvedValue({ count: 0 });
    prismaMock.developerTechnology.deleteMany.mockResolvedValue({ count: 0 });
  });

  describe('getUserReviews', () => {
    test('getUserReviews rejects missing user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        profilesService.getUserReviews({
          userId: 'u1',
          page: 1,
          size: 20,
        })
      ).rejects.toMatchObject({
        status: 404,
        code: 'USER_NOT_FOUND',
      });
    });

    test('getUserReviews returns paginated reviews', async () => {
      const createdAt1 = new Date('2026-02-14T10:00:00Z');
      const createdAt2 = new Date('2026-02-14T15:00:00Z');

      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.review.findMany.mockResolvedValue([
        {
          id: 'r1',
          taskId: 't1',
          rating: 5,
          text: 'Great work',
          createdAt: createdAt2,
          author: {
            id: 'u2',
            developerProfile: { displayName: 'Reviewer Dev' },
            companyProfile: null,
          },
        },
        {
          id: 'r2',
          taskId: 't2',
          rating: 4,
          text: 'Good collaboration',
          createdAt: createdAt1,
          author: {
            id: 'u3',
            developerProfile: null,
            companyProfile: { companyName: 'Company X' },
          },
        },
      ]);
      prismaMock.review.count.mockResolvedValue(2);

      const result = await profilesService.getUserReviews({
        userId: 'u1',
        page: 1,
        size: 20,
      });

      expect(result).toEqual({
        items: [
          {
            review_id: 'r1',
            task_id: 't1',
            rating: 5,
            text: 'Great work',
            created_at: createdAt2.toISOString(),
            author: {
              user_id: 'u2',
              display_name: 'Reviewer Dev',
              company_name: null,
            },
          },
          {
            review_id: 'r2',
            task_id: 't2',
            rating: 4,
            text: 'Good collaboration',
            created_at: createdAt1.toISOString(),
            author: {
              user_id: 'u3',
              display_name: 'Company X',
              company_name: 'Company X',
            },
          },
        ],
        page: 1,
        size: 20,
        total: 2,
      });

      expect(prismaMock.review.findMany).toHaveBeenCalledWith({
        where: { targetUserId: 'u1' },
        select: {
          id: true,
          taskId: true,
          rating: true,
          text: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              developerProfile: {
                select: {
                  displayName: true,
                },
              },
              companyProfile: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    test('getUserReviews respects pagination parameters', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u1' });
      prismaMock.review.findMany.mockResolvedValue([]);
      prismaMock.review.count.mockResolvedValue(0);

      await profilesService.getUserReviews({
        userId: 'u1',
        page: 3,
        size: 10,
      });

      expect(prismaMock.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      );
    });
  });
});
