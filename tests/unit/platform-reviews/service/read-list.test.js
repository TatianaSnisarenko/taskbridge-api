import { jest } from '@jest/globals';

const prismaMock = {
  platformReview: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));

const platformReviewsService = await import('../../../../src/services/platform-reviews.service.js');

describe('Platform Reviews Service - getPlatformReviews', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
          developerProfile: {
            displayName: 'John',
            avatarUrl: 'https://cdn.example.com/avatars/john.png',
          },
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
    expect(result.reviews[0]).toMatchObject({
      author_name: 'John',
      author_type: 'developer',
      author_image_url: 'https://cdn.example.com/avatars/john.png',
    });
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
          developerProfile: {
            displayName: 'John',
            avatarUrl: 'https://cdn.example.com/avatars/john.png',
          },
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
          companyProfile: {
            companyName: 'CompanyX',
            logoUrl: 'https://cdn.example.com/logos/companyx.png',
          },
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
    expect(result.reviews[0]).toMatchObject({
      author_type: 'developer',
      author_image_url: 'https://cdn.example.com/avatars/john.png',
    });
    expect(result.reviews[1]).toMatchObject({
      author_name: 'CompanyX',
      author_type: 'company',
      author_image_url: 'https://cdn.example.com/logos/companyx.png',
    });
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
          developerProfile: {
            displayName: 'John',
            avatarUrl: 'https://cdn.example.com/avatars/john.png',
          },
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
          developerProfile: {
            displayName: 'John',
            avatarUrl: 'https://cdn.example.com/avatars/john.png',
          },
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
    prismaMock.platformReview.findMany.mockResolvedValue([]);
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
    prismaMock.platformReview.findMany.mockResolvedValue([]);
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
    prismaMock.platformReview.findMany.mockResolvedValue([]);
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
