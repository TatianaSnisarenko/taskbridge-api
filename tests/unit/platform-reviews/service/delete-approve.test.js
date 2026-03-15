import { jest } from '@jest/globals';

const prismaMock = {
  platformReview: {
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - Delete & Approve', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('deletePlatformReview', () => {
    test('should delete review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.delete.mockResolvedValue(mockReview);

      const result = await platformReviewsService.deletePlatformReview({
        reviewId: 'review-123',
      });

      expect(result.deleted).toBe(true);
      expect(prismaMock.platformReview.delete).toHaveBeenCalledWith({
        where: { id: 'review-123' },
      });
    });

    test('should throw error if review not found', async () => {
      prismaMock.platformReview.findUnique.mockResolvedValue(null);

      await expect(
        platformReviewsService.deletePlatformReview({
          reviewId: 'nonexistent',
        })
      ).rejects.toThrow('Platform review not found');
    });
  });

  describe('approvePlatformReview', () => {
    test('should approve pending review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockApprovedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Great platform!',
        isApproved: true,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: {
            displayName: 'John',
            avatarUrl: 'https://cdn.example.com/avatars/john.png',
          },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockApprovedReview);

      const result = await platformReviewsService.approvePlatformReview({
        reviewId: 'review-123',
      });

      expect(result.is_approved).toBe(true);
      expect(result.author_type).toBe('developer');
      expect(result.author_image_url).toBe('https://cdn.example.com/avatars/john.png');
      expect(prismaMock.platformReview.update).toHaveBeenCalledWith({
        where: { id: 'review-123' },
        data: { isApproved: true },
        include: expect.any(Object),
      });
    });

    test('should throw error if review already approved', async () => {
      const mockReview = {
        id: 'review-123',
        isApproved: true,
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.approvePlatformReview({
          reviewId: 'review-123',
        })
      ).rejects.toThrow('Review is already approved');
    });

    test('should throw error if review not found for approval', async () => {
      prismaMock.platformReview.findUnique.mockResolvedValue(null);

      await expect(
        platformReviewsService.approvePlatformReview({
          reviewId: 'nonexistent',
        })
      ).rejects.toThrow('Platform review not found');
    });
  });
});
