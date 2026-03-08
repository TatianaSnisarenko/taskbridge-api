import { jest } from '@jest/globals';

const prismaMock = {
  platformReview: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - Read', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPlatformReviews', () => {
    test('should return approved reviews for non-admin', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          userId: 'user-1',
          rating: 5,
          text: 'Great!',
          isApproved: true,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          updatedAt: new Date('2026-03-08T10:00:00Z'),
          user: {
            id: 'user-1',
            developerProfile: { displayName: 'John' },
            companyProfile: null,
          },
        },
      ];

      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(1);

      const result = await platformReviewsService.getPlatformReviews({
        status: 'approved',
        limit: 20,
        offset: 0,
        sort: 'newest',
        isAdmin: false,
      });

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: true },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    test('should return all reviews for admin with status=all', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          userId: 'user-1',
          rating: 5,
          text: 'Great!',
          isApproved: true,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          updatedAt: new Date('2026-03-08T10:00:00Z'),
          user: {
            id: 'user-1',
            developerProfile: { displayName: 'John' },
            companyProfile: null,
          },
        },
        {
          id: 'review-2',
          userId: 'user-2',
          rating: 3,
          text: 'Could be better',
          isApproved: false,
          createdAt: new Date('2026-03-08T09:00:00Z'),
          updatedAt: new Date('2026-03-08T09:00:00Z'),
          user: {
            id: 'user-2',
            developerProfile: null,
            companyProfile: { companyName: 'CompanyX' },
          },
        },
      ];

      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(2);

      const result = await platformReviewsService.getPlatformReviews({
        status: 'all',
        limit: 20,
        offset: 0,
        sort: 'newest',
        isAdmin: true,
      });

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: {},
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    test('should return pending reviews for admin with status=pending', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          userId: 'user-1',
          rating: 3,
          text: 'Pending review',
          isApproved: false,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          updatedAt: new Date('2026-03-08T10:00:00Z'),
          user: {
            id: 'user-1',
            developerProfile: { displayName: 'John' },
            companyProfile: null,
          },
        },
      ];

      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(1);

      const result = await platformReviewsService.getPlatformReviews({
        status: 'pending',
        limit: 20,
        offset: 0,
        sort: 'newest',
        isAdmin: true,
      });

      expect(result.reviews).toHaveLength(1);
      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: false },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    test('should return approved reviews for admin with status=approved', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          userId: 'user-1',
          rating: 5,
          text: 'Approved review',
          isApproved: true,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          updatedAt: new Date('2026-03-08T10:00:00Z'),
          user: {
            id: 'user-1',
            developerProfile: { displayName: 'John' },
            companyProfile: null,
          },
        },
      ];

      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(1);

      const result = await platformReviewsService.getPlatformReviews({
        status: 'approved',
        limit: 20,
        offset: 0,
        sort: 'newest',
        isAdmin: true,
      });

      expect(result.reviews).toHaveLength(1);
      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: true },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    test('should support oldest sort', async () => {
      const mockReviews = [];
      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(0);

      await platformReviewsService.getPlatformReviews({
        status: 'approved',
        limit: 20,
        offset: 0,
        sort: 'oldest',
        isAdmin: false,
      });

      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: true },
        take: 20,
        skip: 0,
        orderBy: { createdAt: 'asc' },
        include: expect.any(Object),
      });
    });

    test('should support highest_rated sort', async () => {
      const mockReviews = [];
      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(0);

      await platformReviewsService.getPlatformReviews({
        status: 'approved',
        limit: 20,
        offset: 0,
        sort: 'highest_rated',
        isAdmin: false,
      });

      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: true },
        take: 20,
        skip: 0,
        orderBy: { rating: 'desc' },
        include: expect.any(Object),
      });
    });

    test('should support lowest_rated sort', async () => {
      const mockReviews = [];
      prismaMock.platformReview.findMany.mockResolvedValue(mockReviews);
      prismaMock.platformReview.count.mockResolvedValue(0);

      await platformReviewsService.getPlatformReviews({
        status: 'approved',
        limit: 20,
        offset: 0,
        sort: 'lowest_rated',
        isAdmin: false,
      });

      expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
        where: { isApproved: true },
        take: 20,
        skip: 0,
        orderBy: { rating: 'asc' },
        include: expect.any(Object),
      });
    });
  });

  describe('getPlatformReview', () => {
    test('should return approved review for public access', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Excellent platform!',
        isApproved: true,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'Jane' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      const result = await platformReviewsService.getPlatformReview({
        reviewId: 'review-123',
        userId: null,
        isAdmin: false,
      });

      expect(result.review_id).toBe('review-123');
      expect(result.author_name).toBe('Jane');
    });

    test('should throw error if review not found', async () => {
      prismaMock.platformReview.findUnique.mockResolvedValue(null);

      await expect(
        platformReviewsService.getPlatformReview({
          reviewId: 'nonexistent',
          userId: null,
          isAdmin: false,
        })
      ).rejects.toThrow('Platform review not found');
    });

    test('should throw error if non-approved review accessed by non-owner non-admin', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Pending review',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'Jane' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.getPlatformReview({
          reviewId: 'review-123',
          userId: 'different-user',
          isAdmin: false,
        })
      ).rejects.toThrow('You do not have permission to view this review');
    });

    test('should allow owner to view their own unapproved review', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Pending review',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'Jane' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      const result = await platformReviewsService.getPlatformReview({
        reviewId: 'review-123',
        userId: 'user-123',
        isAdmin: false,
      });

      expect(result.review_id).toBe('review-123');
    });

    test('should allow viewing approved review without userId', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Approved review',
        isApproved: true,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'Jane' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      const result = await platformReviewsService.getPlatformReview({
        reviewId: 'review-123',
        userId: null,
        isAdmin: false,
      });

      expect(result.review_id).toBe('review-123');
      expect(result.is_approved).toBe(true);
    });

    test('should not allow viewing unapproved review without userId', async () => {
      const mockReview = {
        id: 'review-123',
        userId: 'user-123',
        rating: 5,
        text: 'Pending review',
        isApproved: false,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        updatedAt: new Date('2026-03-08T10:00:00Z'),
        user: {
          id: 'user-123',
          developerProfile: { displayName: 'Jane' },
          companyProfile: null,
        },
      };

      prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

      await expect(
        platformReviewsService.getPlatformReview({
          reviewId: 'review-123',
          userId: null,
          isAdmin: false,
        })
      ).rejects.toThrow('You do not have permission to view this review');
    });
  });
});
