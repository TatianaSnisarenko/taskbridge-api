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

describe('Platform Reviews Service - Update & Delete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('updatePlatformReview', () => {
    test('should throw error if review not found for update', async () => {
      prismaMock.platformReview.findUnique.mockResolvedValue(null);

      await expect(
        platformReviewsService.updatePlatformReview({
          reviewId: 'nonexistent',
          userId: 'user-123',
          isAdmin: false,
          updates: { rating: 5 },
        })
      ).rejects.toThrow('Platform review not found');
    });

    test('should allow owner to update unapproved review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4,
        text: 'Updated review text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'user-123',
        isAdmin: false,
        updates: {
          rating: 4,
          text: 'Updated review text',
        },
      });

      expect(result.rating).toBe(4);
      expect(result.text).toBe('Updated review text');
    });

    test('should not allow owner to approve their own review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.updatePlatformReview({
          reviewId: 'review-123',
          userId: 'user-123',
          isAdmin: false,
          updates: {
            is_approved: true,
          },
        })
      ).rejects.toThrow('You cannot approve your own review');
    });

    test('should allow admin to update and approve any review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4,
        text: 'Original text',
        isApproved: true,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'admin-user',
        isAdmin: true,
        updates: {
          is_approved: true,
        },
      });

      expect(result.is_approved).toBe(true);
    });

    test('should not allow non-owner non-admin to update review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.updatePlatformReview({
          reviewId: 'review-123',
          userId: 'other-user',
          isAdmin: false,
          updates: {
            rating: 4,
          },
        })
      ).rejects.toThrow('You do not have permission to update this review');
    });

    test('should not allow owner to update approved review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: true,
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.updatePlatformReview({
          reviewId: 'review-123',
          userId: 'user-123',
          isAdmin: false,
          updates: {
            rating: 4,
          },
        })
      ).rejects.toThrow('You do not have permission to update this review');
    });

    test('should allow owner to update unapproved review without approval flag', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4,
        text: 'Updated text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'user-123',
        isAdmin: false,
        updates: {
          rating: 4,
          text: 'Updated text',
        },
      });

      expect(result.rating).toBe(4);
      expect(result.text).toBe('Updated text');
    });

    test('should allow admin to update only rating', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Original text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'admin-user',
        isAdmin: true,
        updates: {
          rating: 5,
        },
      });

      expect(result.rating).toBe(5);
      expect(prismaMock.platformReview.update).toHaveBeenCalledWith({
        where: { id: 'review-123' },
        data: { rating: 5 },
        include: expect.any(Object),
      });
    });

    test('should allow admin to update only text', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 4,
        text: 'Admin updated text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'admin-user',
        isAdmin: true,
        updates: {
          text: 'Admin updated text',
        },
      });

      expect(result.text).toBe('Admin updated text');
      expect(prismaMock.platformReview.update).toHaveBeenCalledWith({
        where: { id: 'review-123' },
        data: { text: 'Admin updated text' },
        include: expect.any(Object),
      });
    });

    test('should allow owner to update only rating of unapproved review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 3,
        text: 'Original text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'user-123',
        isAdmin: false,
        updates: {
          rating: 3,
        },
      });

      expect(result.rating).toBe(3);
    });

    test('should allow owner to update only text of unapproved review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        isApproved: false,
      };

      const mockUpdatedReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Owner updated text',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T11:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'John' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);
      prismaMock.platformReview.update.mockResolvedValue(mockUpdatedReview);

      const result = await platformReviewsService.updatePlatformReview({
        reviewId: 'review-123',
        userId: 'user-123',
        isAdmin: false,
        updates: {
          text: 'Owner updated text',
        },
      });

      expect(result.text).toBe('Owner updated text');
    });
  });
});
