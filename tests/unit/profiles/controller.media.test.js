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

describe('profiles.controller media', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uploadDeveloperAvatar validates missing file', async () => {
    const req = { user: { id: 'u-1' }, file: undefined };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadDeveloperAvatar(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(profilesServiceMock.uploadDeveloperAvatar).not.toHaveBeenCalled();
  });

  test('uploadDeveloperAvatar validates file size limit', async () => {
    const req = {
      user: { id: 'u-1' },
      file: {
        mimetype: 'image/jpeg',
        size: 6000000,
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadDeveloperAvatar(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(profilesServiceMock.uploadDeveloperAvatar).not.toHaveBeenCalled();
  });

  test('uploadDeveloperAvatar succeeds with valid file', async () => {
    profilesServiceMock.uploadDeveloperAvatar.mockResolvedValue({
      userId: 'u-1',
      avatarUrl: 'https://cdn.example.com/avatar.jpg',
      updatedAt: new Date('2026-03-08T11:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      file: {
        mimetype: 'image/jpeg',
        size: 1024 * 100,
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadDeveloperAvatar(req, res, next);

    expect(profilesServiceMock.uploadDeveloperAvatar).toHaveBeenCalledWith({
      userId: 'u-1',
      file: req.file,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      updated_at: '2026-03-08T11:00:00.000Z',
    });
  });

  test('deleteDeveloperAvatar maps service result to response', async () => {
    profilesServiceMock.deleteDeveloperAvatar.mockResolvedValue({
      userId: 'u-1',
      avatarUrl: null,
      updatedAt: new Date('2026-03-08T12:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.deleteDeveloperAvatar(req, res, next);

    expect(profilesServiceMock.deleteDeveloperAvatar).toHaveBeenCalledWith({
      userId: 'u-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('uploadCompanyLogo validates missing file', async () => {
    const req = {
      user: { id: 'u-1' },
      file: undefined,
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadCompanyLogo(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(profilesServiceMock.uploadCompanyLogo).not.toHaveBeenCalled();
  });

  test('uploadCompanyLogo validates file type and returns validation error', async () => {
    const req = {
      user: { id: 'u-1' },
      file: {
        mimetype: 'image/gif',
        size: 1000,
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadCompanyLogo(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(profilesServiceMock.uploadCompanyLogo).not.toHaveBeenCalled();
  });

  test('uploadCompanyLogo validates file size limit', async () => {
    const req = {
      user: { id: 'u-1' },
      file: {
        mimetype: 'image/png',
        size: 6_000_000,
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadCompanyLogo(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 400,
        code: 'VALIDATION_ERROR',
      })
    );
    expect(profilesServiceMock.uploadCompanyLogo).not.toHaveBeenCalled();
  });

  test('uploadCompanyLogo succeeds with valid file', async () => {
    profilesServiceMock.uploadCompanyLogo.mockResolvedValue({
      userId: 'u-1',
      logoUrl: 'https://cdn.example.com/logo.png',
      updatedAt: new Date('2026-03-08T13:00:00.000Z'),
    });

    const req = {
      user: { id: 'u-1' },
      file: {
        mimetype: 'image/png',
        size: 2048,
      },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.uploadCompanyLogo(req, res, next);

    expect(profilesServiceMock.uploadCompanyLogo).toHaveBeenCalledWith({
      userId: 'u-1',
      file: req.file,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('deleteCompanyLogo maps service result to response', async () => {
    profilesServiceMock.deleteCompanyLogo.mockResolvedValue({
      userId: 'u-1',
      logoUrl: null,
      updatedAt: new Date('2026-03-08T14:00:00.000Z'),
    });

    const req = { user: { id: 'u-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await profilesController.deleteCompanyLogo(req, res, next);

    expect(profilesServiceMock.deleteCompanyLogo).toHaveBeenCalledWith({
      userId: 'u-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
