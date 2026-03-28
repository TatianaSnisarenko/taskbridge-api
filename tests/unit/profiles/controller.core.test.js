import { jest } from '@jest/globals';

const profilesServiceMock = {
  createDeveloperProfile: jest.fn(),
  updateDeveloperProfile: jest.fn(),
  getDeveloperProfileByUserId: jest.fn(),
  createCompanyProfile: jest.fn(),
  updateCompanyProfile: jest.fn(),
  getCompanyProfileByUserId: jest.fn(),
  getUserReviews: jest.fn(),
  uploadDeveloperAvatar: jest.fn(),
  deleteDeveloperAvatar: jest.fn(),
  uploadCompanyLogo: jest.fn(),
  deleteCompanyLogo: jest.fn(),
  getDevelopersCatalog: jest.fn(),
};

jest.unstable_mockModule('../../src/services/profiles/index.js', () => profilesServiceMock);

const profilesController = await import('../../../src/controllers/profiles.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('profiles.controller core', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createDeveloperProfile returns mapped response', async () => {
    profilesServiceMock.createDeveloperProfile.mockResolvedValue({
      userId: 'u-1',
      created: true,
    });

    const req = { user: { id: 'u-1' }, body: { display_name: 'Dev' } };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.createDeveloperProfile(req, res, next);

    expect(profilesServiceMock.createDeveloperProfile).toHaveBeenCalledWith({
      userId: 'u-1',
      profile: { display_name: 'Dev' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      created: true,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('updateDeveloperProfile maps service result to response', async () => {
    profilesServiceMock.updateDeveloperProfile.mockResolvedValue({
      user_id: 'u-1',
      display_name: 'Dev Updated',
      updated: true,
    });

    const req = {
      user: { id: 'u-1' },
      body: { display_name: 'Dev Updated' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.updateDeveloperProfile(req, res, next);

    expect(profilesServiceMock.updateDeveloperProfile).toHaveBeenCalledWith({
      userId: 'u-1',
      profile: { display_name: 'Dev Updated' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getDeveloperProfile retrieves profile by user ID', async () => {
    profilesServiceMock.getDeveloperProfileByUserId.mockResolvedValue({
      user_id: 'u-2',
      display_name: 'Another Dev',
    });

    const req = {
      params: { userId: 'u-2' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getDeveloperProfile(req, res, next);

    expect(profilesServiceMock.getDeveloperProfileByUserId).toHaveBeenCalledWith({
      userId: 'u-2',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('createCompanyProfile returns mapped response', async () => {
    profilesServiceMock.createCompanyProfile.mockResolvedValue({
      userId: 'u-1',
      created: true,
    });

    const req = {
      user: { id: 'u-1' },
      body: { name: 'Tech Corp' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.createCompanyProfile(req, res, next);

    expect(profilesServiceMock.createCompanyProfile).toHaveBeenCalledWith({
      userId: 'u-1',
      profile: { name: 'Tech Corp' },
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('updateCompanyProfile maps service result to response', async () => {
    profilesServiceMock.updateCompanyProfile.mockResolvedValue({
      user_id: 'u-1',
      updated: true,
      updatedAt: new Date('2026-03-08T10:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      body: { name: 'Tech Corp Updated' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.updateCompanyProfile(req, res, next);

    expect(profilesServiceMock.updateCompanyProfile).toHaveBeenCalledWith({
      userId: 'u-1',
      profile: { name: 'Tech Corp Updated' },
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getCompanyProfile retrieves profile by user ID', async () => {
    profilesServiceMock.getCompanyProfileByUserId.mockResolvedValue({
      user_id: 'u-3',
      name: 'Another Corp',
    });

    const req = {
      params: { userId: 'u-3' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getCompanyProfile(req, res, next);

    expect(profilesServiceMock.getCompanyProfileByUserId).toHaveBeenCalledWith({
      userId: 'u-3',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getUserReviews parses pagination params', async () => {
    profilesServiceMock.getUserReviews.mockResolvedValue({
      items: [{ review_id: 'r-1' }],
      page: 1,
      size: 10,
    });

    const req = {
      params: { userId: 'u-2' },
      query: { page: '1', size: '10' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getUserReviews(req, res, next);

    expect(profilesServiceMock.getUserReviews).toHaveBeenCalledWith({
      userId: 'u-2',
      page: '1',
      size: '10',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('getDevelopers passes query params to service and returns result', async () => {
    const mockResult = {
      items: [{ user_id: 'u-1', display_name: 'Alice', avg_rating: 4.8, technologies: [] }],
      page: 1,
      size: 20,
      total: 1,
    };
    profilesServiceMock.getDevelopersCatalog.mockResolvedValue(mockResult);

    const req = {
      query: {
        page: 1,
        size: 20,
        technology_type: 'BACKEND',
        technology_ids: ['uuid-1', 'uuid-2'],
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getDevelopers(req, res, next);

    expect(profilesServiceMock.getDevelopersCatalog).toHaveBeenCalledWith({
      page: 1,
      size: 20,
      technology_type: 'BACKEND',
      technology_ids: ['uuid-1', 'uuid-2'],
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockResult);
    expect(next).not.toHaveBeenCalled();
  });

  test('getDevelopers converts single technology_ids string to array', async () => {
    profilesServiceMock.getDevelopersCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      query: {
        page: 1,
        size: 10,
        technology_ids: 'uuid-single',
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getDevelopers(req, res, next);

    expect(profilesServiceMock.getDevelopersCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        technology_ids: ['uuid-single'],
      })
    );
  });

  test('getDevelopers defaults technology_ids to empty array when not provided', async () => {
    profilesServiceMock.getDevelopersCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      query: { page: 1, size: 20 },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getDevelopers(req, res, next);

    expect(profilesServiceMock.getDevelopersCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        technology_ids: [],
      })
    );
  });

  test('getDevelopers passes technology_type when provided', async () => {
    profilesServiceMock.getDevelopersCatalog.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
    });

    const req = {
      query: { technology_type: 'FRONTEND' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.getDevelopers(req, res, next);

    expect(profilesServiceMock.getDevelopersCatalog).toHaveBeenCalledWith(
      expect.objectContaining({ technology_type: 'FRONTEND' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
