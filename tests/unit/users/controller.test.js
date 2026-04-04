import { jest } from '@jest/globals';

const userServiceMock = {
  setUserModeratorRole: jest.fn(),
  getUsersCatalog: jest.fn(),
};

jest.unstable_mockModule('../../src/services/user/index.js', () => ({
  ...userServiceMock,
}));

const usersController = await import('../../../src/controllers/users.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('users.controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('toggleModeratorRole maps response fields from service result', async () => {
    userServiceMock.setUserModeratorRole.mockResolvedValue({
      id: 'u-1',
      roles: ['USER', 'MODERATOR'],
    });

    const req = {
      params: { userId: 'u-1' },
      body: { enabled: true },
      user: { id: 'admin-1' },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await usersController.toggleModeratorRole(req, res, next);

    expect(userServiceMock.setUserModeratorRole).toHaveBeenCalledWith({
      userId: 'u-1',
      enabled: true,
      actorUserId: 'admin-1',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      roles: ['USER', 'MODERATOR'],
      moderator_enabled: true,
    });
  });

  test('getUsersCatalog maps paginated response fields from service result', async () => {
    userServiceMock.getUsersCatalog.mockResolvedValue({
      items: [
        {
          user_id: 'u-1',
          email: 'u1@example.com',
          created_at: new Date('2026-03-20T10:00:00.000Z'),
        },
      ],
      page: 2,
      size: 5,
      total: 11,
    });

    const req = {
      query: { page: 2, size: 5 },
    };
    const res = createResponseMock();
    const next = jest.fn();

    await usersController.getUsersCatalog(req, res, next);

    expect(userServiceMock.getUsersCatalog).toHaveBeenCalledWith({
      page: 2,
      size: 5,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [
        {
          user_id: 'u-1',
          email: 'u1@example.com',
          created_at: new Date('2026-03-20T10:00:00.000Z'),
        },
      ],
      page: 2,
      size: 5,
      total: 11,
    });
  });
});
