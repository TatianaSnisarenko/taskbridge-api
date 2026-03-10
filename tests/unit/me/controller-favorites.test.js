import { jest } from '@jest/globals';

const prismaMock = {
  developerProfile: { findUnique: jest.fn() },
  companyProfile: { findUnique: jest.fn() },
};

const meServiceMock = {
  getMyApplications: jest.fn(),
  getMyTasks: jest.fn(),
  getMyProjects: jest.fn(),
  getMyNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
  getMyThreads: jest.fn(),
  getThreadById: jest.fn(),
  getThreadMessages: jest.fn(),
  createMessage: jest.fn(),
  markThreadAsRead: jest.fn(),
  addFavoriteTask: jest.fn(),
  removeFavoriteTask: jest.fn(),
  getMyFavoriteTasks: jest.fn(),
};

const invitesServiceMock = { getMyInvites: jest.fn() };

jest.unstable_mockModule('../../src/db/prisma.js', () => ({ prisma: prismaMock }));
jest.unstable_mockModule('../../src/services/me/index.js', () => meServiceMock);
jest.unstable_mockModule('../../src/services/invites/index.js', () => invitesServiceMock);

const meController = await import('../../../src/controllers/me.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('me.controller - favorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('addFavoriteTask calls service and returns 201 with favorite data', async () => {
    const savedAt = new Date('2026-03-10T12:00:00Z').toISOString();
    meServiceMock.addFavoriteTask.mockResolvedValue({
      favorite_id: 'fav-1',
      task_id: 't-1',
      saved_at: savedAt,
    });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.addFavoriteTask(req, res, next);

    expect(meServiceMock.addFavoriteTask).toHaveBeenCalledWith({ userId: 'u-1', taskId: 't-1' });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      favorite_id: 'fav-1',
      task_id: 't-1',
      saved_at: savedAt,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('removeFavoriteTask calls service and returns 200 with removed flag', async () => {
    meServiceMock.removeFavoriteTask.mockResolvedValue({ task_id: 't-1', removed: true });

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.removeFavoriteTask(req, res, next);

    expect(meServiceMock.removeFavoriteTask).toHaveBeenCalledWith({ userId: 'u-1', taskId: 't-1' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ task_id: 't-1', removed: true });
    expect(next).not.toHaveBeenCalled();
  });

  test('getMyFavoriteTasks parses pagination and returns paginated list', async () => {
    meServiceMock.getMyFavoriteTasks.mockResolvedValue({
      items: [{ favorite_id: 'fav-1', task: { task_id: 't-1' } }],
      page: 2,
      size: 10,
      total: 11,
    });

    const req = { user: { id: 'u-1' }, query: { page: '2', size: '10' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyFavoriteTasks(req, res, next);

    expect(meServiceMock.getMyFavoriteTasks).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 2,
      size: 10,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ favorite_id: 'fav-1', task: { task_id: 't-1' } }],
      page: 2,
      size: 10,
      total: 11,
    });
  });

  test('getMyFavoriteTasks defaults to page 1 and size 20 when params are invalid', async () => {
    meServiceMock.getMyFavoriteTasks.mockResolvedValue({ items: [], page: 1, size: 20, total: 0 });

    const req = { user: { id: 'u-1' }, query: { page: 'abc', size: 'xyz' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyFavoriteTasks(req, res, next);

    expect(meServiceMock.getMyFavoriteTasks).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
    });
  });

  test('addFavoriteTask forwards errors to next()', async () => {
    meServiceMock.addFavoriteTask.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.addFavoriteTask(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });

  test('removeFavoriteTask forwards errors to next()', async () => {
    meServiceMock.removeFavoriteTask.mockRejectedValue(new Error('DB error'));

    const req = { user: { id: 'u-1' }, params: { taskId: 't-1' } };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.removeFavoriteTask(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
