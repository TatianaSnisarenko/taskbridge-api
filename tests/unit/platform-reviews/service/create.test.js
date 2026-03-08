import { jest } from '@jest/globals';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
  },
  platformReview: {
    create: jest.fn(),
    findFirst: jest.fn(),
  },
};

const envMock = {
  platformReviewCooldownDays: 30,
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/config/env.js', () => ({ env: envMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - Create', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlatformReview', () => {
    test('should create a platform review for developer', async () => {
      const userId = 'user-123';
      const rating = 5;
      const text = 'Great platform, really helps connect with companies!';

      const mockUser = {
        id: userId,
        developerProfile: { displayName: 'John Doe' },
        companyProfile: null,
      };

      const mockReview = {
        id: 'review-123',
        userId,
        rating,
        text,
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: mockUser,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.platformReview.findFirst.mockResolvedValue(null);
      prismaMock.platformReview.create.mockResolvedValue(mockReview);

      const result = await platformReviewsService.createPlatformReview({
        userId,
        rating,
        text,
      });

      expect(result).toEqual({
        review_id: 'review-123',
        user_id: userId,
        author_name: 'John Doe',
        rating: 5,
        text,
        is_approved: false,
        created_at: '2026-03-08T10:00:00.000Z',
        updated_at: '2026-03-08T10:00:00.000Z',
      });

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          developerProfile: { select: { displayName: true } },
          companyProfile: { select: { companyName: true } },
        },
      });

      expect(prismaMock.platformReview.create).toHaveBeenCalledWith({
        data: {
          userId,
          rating,
          text,
          isApproved: false,
        },
        include: {
          user: {
            select: {
              id: true,
              developerProfile: { select: { displayName: true } },
              companyProfile: { select: { companyName: true } },
            },
          },
        },
      });
    });

    test('should create a platform review for company', async () => {
      const userId = 'user-123';
      const rating = 4;
      const text = 'Good platform for finding talented developers.';

      const mockUser = {
        id: userId,
        developerProfile: null,
        companyProfile: { companyName: 'TechCorp Inc.' },
      };

      const mockReview = {
        id: 'review-123',
        userId,
        rating,
        text,
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: mockUser,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.platformReview.findFirst.mockResolvedValue(null);
      prismaMock.platformReview.create.mockResolvedValue(mockReview);

      const result = await platformReviewsService.createPlatformReview({
        userId,
        rating,
        text,
      });

      expect(result.author_name).toBe('TechCorp Inc.');
    });

    test('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        platformReviewsService.createPlatformReview({
          userId: 'nonexistent',
          rating: 5,
          text: 'Some review',
        })
      ).rejects.toThrow('User not found');
    });

    test('should throw error if cooldown period not passed', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        developerProfile: { displayName: 'John Doe' },
        companyProfile: null,
      };

      const recentReview = {
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.platformReview.findFirst.mockResolvedValue(recentReview);

      await expect(
        platformReviewsService.createPlatformReview({
          userId,
          rating: 5,
          text: 'Another review',
        })
      ).rejects.toThrow(/You can submit a new review in \d+ days?/);
    });

    test('should show singular "day" when exactly 1 day remaining in cooldown', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        developerProfile: { displayName: 'John Doe' },
        companyProfile: null,
      };

      // Create a review exactly 29 days ago (assuming 30 day cooldown)
      const recentReview = {
        createdAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000), // 29.5 days ago
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.platformReview.findFirst.mockResolvedValue(recentReview);

      await expect(
        platformReviewsService.createPlatformReview({
          userId,
          rating: 5,
          text: 'Another review',
        })
      ).rejects.toThrow('You can submit a new review in 1 day');
    });

    test('should create review for user with both profiles (prefer developer)', async () => {
      const userId = 'user-123';
      const rating = 5;
      const text = 'Great platform!';

      const mockUser = {
        id: userId,
        developerProfile: { displayName: 'John Developer' },
        companyProfile: { companyName: 'TechCorp Inc.' },
      };

      const mockReview = {
        id: 'review-123',
        userId,
        rating,
        text,
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: mockUser,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      prismaMock.platformReview.findFirst.mockResolvedValue(null);
      prismaMock.platformReview.create.mockResolvedValue(mockReview);

      const result = await platformReviewsService.createPlatformReview({
        userId,
        rating,
        text,
      });

      expect(result.author_name).toBe('John Developer');
    });
  });
});
