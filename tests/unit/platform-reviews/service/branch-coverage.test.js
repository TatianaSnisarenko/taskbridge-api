import { jest } from '@jest/globals';

const prismaMock = {
  platformReview: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - Branch Coverage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should use default parameters in getPlatformReviews', async () => {
    prismaMock.platformReview.findMany.mockResolvedValue([]);
    prismaMock.platformReview.count.mockResolvedValue(0);

    const result = await platformReviewsService.getPlatformReviews({});

    expect(result).toEqual({
      reviews: [],
      total: 0,
      limit: 20,
      offset: 0,
    });

    expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
      where: { isApproved: true },
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: expect.any(Object),
    });
  });

  test('should include owner pending reviews for authenticated non-admin list', async () => {
    prismaMock.platformReview.findMany.mockResolvedValue([]);
    prismaMock.platformReview.count.mockResolvedValue(0);

    await platformReviewsService.getPlatformReviews({
      userId: 'owner-1',
      isAdmin: false,
      limit: 20,
      offset: 0,
      sort: 'newest',
      status: 'approved',
    });

    expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ isApproved: true }, { userId: 'owner-1' }],
      },
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: expect.any(Object),
    });
  });

  test('should use default sort when invalid sort parameter provided', async () => {
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

    await platformReviewsService.getPlatformReviews({
      status: 'approved',
      limit: 20,
      offset: 0,
      sort: 'invalid_sort_option',
      isAdmin: false,
    });

    expect(prismaMock.platformReview.findMany).toHaveBeenCalledWith({
      where: { isApproved: true },
      take: 20,
      skip: 0,
      orderBy: { createdAt: 'desc' },
      include: expect.any(Object),
    });
  });

  test('should use default parameters in getPlatformReview', async () => {
    const mockReview = {
      id: 'review-1',
      userId: 'user-1',
      rating: 4,
      text: 'Approved review',
      isApproved: true,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T10:00:00Z'),
      user: {
        id: 'user-1',
        developerProfile: { displayName: 'Dev Name' },
        companyProfile: null,
      },
    };

    prismaMock.platformReview.findUnique.mockResolvedValue(mockReview);

    const result = await platformReviewsService.getPlatformReview({ reviewId: 'review-1' });

    expect(result.review_id).toBe('review-1');
    expect(result.author_name).toBe('Dev Name');
  });

  test('should allow admin to view pending review', async () => {
    prismaMock.platformReview.findUnique.mockResolvedValue({
      id: 'review-2',
      userId: 'user-2',
      rating: 3,
      text: 'Pending review',
      isApproved: false,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T10:00:00Z'),
      user: {
        id: 'user-2',
        developerProfile: { displayName: 'Admin Visible' },
        companyProfile: null,
      },
    });

    const result = await platformReviewsService.getPlatformReview({
      reviewId: 'review-2',
      userId: 'admin-1',
      isAdmin: true,
    });

    expect(result.review_id).toBe('review-2');
    expect(result.is_approved).toBe(false);
  });

  test('should fallback to company name in getPlatformReview response', async () => {
    prismaMock.platformReview.findUnique.mockResolvedValue({
      id: 'review-3',
      userId: 'user-3',
      rating: 5,
      text: 'Public review',
      isApproved: true,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T10:00:00Z'),
      user: {
        id: 'user-3',
        developerProfile: null,
        companyProfile: { companyName: 'TechCorp' },
      },
    });

    const result = await platformReviewsService.getPlatformReview({
      reviewId: 'review-3',
      userId: null,
      isAdmin: false,
    });

    expect(result.author_name).toBe('TechCorp');
  });

  test('should allow admin update with empty updates object', async () => {
    prismaMock.platformReview.findUnique.mockResolvedValue({
      id: 'review-1',
      userId: 'owner-1',
      isApproved: false,
    });

    prismaMock.platformReview.update.mockResolvedValue({
      id: 'review-1',
      userId: 'owner-1',
      rating: 4,
      text: 'Original text',
      isApproved: false,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T11:00:00Z'),
      user: {
        id: 'owner-1',
        developerProfile: { displayName: 'John' },
        companyProfile: null,
      },
    });

    const result = await platformReviewsService.updatePlatformReview({
      reviewId: 'review-1',
      userId: 'admin-1',
      isAdmin: true,
      updates: {},
    });

    expect(result.review_id).toBe('review-1');
    expect(prismaMock.platformReview.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: {},
      include: expect.any(Object),
    });
  });

  test('should fallback to company name in updatePlatformReview response', async () => {
    prismaMock.platformReview.findUnique.mockResolvedValue({
      id: 'review-1',
      userId: 'owner-1',
      isApproved: false,
    });

    prismaMock.platformReview.update.mockResolvedValue({
      id: 'review-1',
      userId: 'owner-1',
      rating: 5,
      text: 'Updated',
      isApproved: false,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T11:00:00Z'),
      user: {
        id: 'owner-1',
        developerProfile: null,
        companyProfile: { companyName: 'Company Fallback' },
      },
    });

    const result = await platformReviewsService.updatePlatformReview({
      reviewId: 'review-1',
      userId: 'admin-1',
      isAdmin: true,
      updates: { rating: 5 },
    });

    expect(result.author_name).toBe('Company Fallback');
  });

  test('should fallback to company name in approvePlatformReview response', async () => {
    prismaMock.platformReview.findUnique.mockResolvedValue({
      id: 'review-1',
      isApproved: false,
    });

    prismaMock.platformReview.update.mockResolvedValue({
      id: 'review-1',
      userId: 'owner-1',
      rating: 5,
      text: 'Approved text',
      isApproved: true,
      createdAt: new Date('2026-03-08T10:00:00Z'),
      updatedAt: new Date('2026-03-08T11:00:00Z'),
      user: {
        id: 'owner-1',
        developerProfile: null,
        companyProfile: { companyName: 'Approved Company' },
      },
    });

    const result = await platformReviewsService.approvePlatformReview({
      reviewId: 'review-1',
    });

    expect(result.author_name).toBe('Approved Company');
  });
});
