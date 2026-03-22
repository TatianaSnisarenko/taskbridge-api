import { jest } from '@jest/globals';

const platformReviewsServiceMock = {
  createPlatformReview: jest.fn(),
  getPlatformReviews: jest.fn(),
  getPlatformReview: jest.fn(),
  updatePlatformReview: jest.fn(),
  deletePlatformReview: jest.fn(),
  approvePlatformReview: jest.fn(),
};

jest.unstable_mockModule('../../src/services/platform-reviews.service.js', () => ({
  ...platformReviewsServiceMock,
}));

const platformReviewsController =
  await import('../../../src/controllers/platform-reviews.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('platform-reviews.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createPlatformReview forwards payload and returns 201', async () => {
    const result = { id: 'r-1' };
    platformReviewsServiceMock.createPlatformReview.mockResolvedValue(result);
    const req = { user: { id: 'u-1' }, persona: 'developer', body: { rating: 5, text: 'Great' } };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.createPlatformReview(req, res, next);

    expect(platformReviewsServiceMock.createPlatformReview).toHaveBeenCalledWith({
      userId: 'u-1',
      rating: 5,
      text: 'Great',
      authorPersona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('getPlatformReviews forwards query and optional admin context', async () => {
    const result = { items: [] };
    platformReviewsServiceMock.getPlatformReviews.mockResolvedValue(result);
    const req = {
      query: { status: 'APPROVED', limit: '10', offset: '20', sort: 'newest' },
      user: { id: 'u-2', isAdminOrModerator: true },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.getPlatformReviews(req, res, next);

    expect(platformReviewsServiceMock.getPlatformReviews).toHaveBeenCalledWith({
      status: 'APPROVED',
      limit: '10',
      offset: '20',
      sort: 'newest',
      userId: 'u-2',
      isAdmin: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('getPlatformReviews defaults requester context when user is absent', async () => {
    const result = { items: [] };
    platformReviewsServiceMock.getPlatformReviews.mockResolvedValue(result);
    const req = {
      query: { status: 'APPROVED', limit: '5', offset: '0', sort: 'oldest' },
    };
    const res = createResponseMock();

    await platformReviewsController.getPlatformReviews(req, res, jest.fn());

    expect(platformReviewsServiceMock.getPlatformReviews).toHaveBeenCalledWith({
      status: 'APPROVED',
      limit: '5',
      offset: '0',
      sort: 'oldest',
      userId: undefined,
      isAdmin: false,
    });
  });

  test('getPlatformReview forwards review and requester context', async () => {
    const result = { id: 'r-2' };
    platformReviewsServiceMock.getPlatformReview.mockResolvedValue(result);
    const req = {
      params: { reviewId: 'r-2' },
      user: { id: 'u-3', isAdminOrModerator: false },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.getPlatformReview(req, res, next);

    expect(platformReviewsServiceMock.getPlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-2',
      userId: 'u-3',
      isAdmin: false,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('getPlatformReview defaults requester context when user is absent', async () => {
    const result = { id: 'r-public' };
    platformReviewsServiceMock.getPlatformReview.mockResolvedValue(result);
    const req = {
      params: { reviewId: 'r-public' },
    };

    await platformReviewsController.getPlatformReview(req, createResponseMock(), jest.fn());

    expect(platformReviewsServiceMock.getPlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-public',
      userId: undefined,
      isAdmin: false,
    });
  });

  test('updatePlatformReview forwards updates and returns 200', async () => {
    const result = { id: 'r-3', updated: true };
    platformReviewsServiceMock.updatePlatformReview.mockResolvedValue(result);
    const req = {
      params: { reviewId: 'r-3' },
      user: { id: 'u-4', isAdminOrModerator: true },
      body: { rating: 4, text: 'Updated', is_approved: true },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.updatePlatformReview(req, res, next);

    expect(platformReviewsServiceMock.updatePlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-3',
      userId: 'u-4',
      isAdmin: true,
      updates: {
        rating: 4,
        text: 'Updated',
        is_approved: true,
      },
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('updatePlatformReview defaults admin flag to false when role marker is absent', async () => {
    const result = { id: 'r-plain', updated: true };
    platformReviewsServiceMock.updatePlatformReview.mockResolvedValue(result);
    const req = {
      params: { reviewId: 'r-plain' },
      user: { id: 'u-4' },
      body: { rating: 4, text: 'Updated', is_approved: false },
    };

    await platformReviewsController.updatePlatformReview(req, createResponseMock(), jest.fn());

    expect(platformReviewsServiceMock.updatePlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-plain',
      userId: 'u-4',
      isAdmin: false,
      updates: {
        rating: 4,
        text: 'Updated',
        is_approved: false,
      },
    });
  });

  test('deletePlatformReview forwards review id and returns 200', async () => {
    const result = { success: true };
    platformReviewsServiceMock.deletePlatformReview.mockResolvedValue(result);
    const req = { params: { reviewId: 'r-4' } };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.deletePlatformReview(req, res, next);

    expect(platformReviewsServiceMock.deletePlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-4',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });

  test('approvePlatformReview forwards review id and returns 200', async () => {
    const result = { approved: true };
    platformReviewsServiceMock.approvePlatformReview.mockResolvedValue(result);
    const req = { params: { reviewId: 'r-5' } };
    const res = createResponseMock();
    const next = jest.fn();

    await platformReviewsController.approvePlatformReview(req, res, next);

    expect(platformReviewsServiceMock.approvePlatformReview).toHaveBeenCalledWith({
      reviewId: 'r-5',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(result);
  });
});
