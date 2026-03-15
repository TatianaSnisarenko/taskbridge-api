import { jest } from '@jest/globals';

const userServiceMock = {
  setUserModeratorRole: jest.fn(),
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
    };
    const res = createResponseMock();
    const next = jest.fn();

    await usersController.toggleModeratorRole(req, res, next);

    expect(userServiceMock.setUserModeratorRole).toHaveBeenCalledWith({
      userId: 'u-1',
      enabled: true,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      user_id: 'u-1',
      roles: ['USER', 'MODERATOR'],
      moderator_enabled: true,
    });
  });
});
