import { jest } from '@jest/globals';

const prismaMock = {
  platformReview: {
    findUnique: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - getPlatformReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
        developerProfile: {
          displayName: 'Jane',
          avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        },
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
    expect(result.author_type).toBe('developer');
    expect(result.author_image_url).toBe('https://cdn.example.com/avatars/jane.png');
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
        developerProfile: {
          displayName: 'Jane',
          avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        },
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
        developerProfile: {
          displayName: 'Jane',
          avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        },
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
        developerProfile: {
          displayName: 'Jane',
          avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        },
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
        developerProfile: {
          displayName: 'Jane',
          avatarUrl: 'https://cdn.example.com/avatars/jane.png',
        },
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
