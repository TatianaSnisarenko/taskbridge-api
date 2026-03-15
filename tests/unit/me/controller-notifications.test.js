import { jest } from '@jest/globals';

const meServiceMock = {
  getMyNotifications: jest.fn(),
  markNotificationAsRead: jest.fn(),
  markNotificationAsUnread: jest.fn(),
  markAllNotificationsAsRead: jest.fn(),
};

jest.unstable_mockModule('../../src/services/me/index.js', () => meServiceMock);

const meController = await import('../../../src/controllers/me.controller.js');

function createResponseMock() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe('me.controller - notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyNotifications maps unread flag and pagination', async () => {
    meServiceMock.getMyNotifications.mockResolvedValue({
      items: [{ id: 'n-1' }],
      page: 3,
      size: 7,
      total: 10,
      unread_total: 4,
    });

    const req = {
      user: { id: 'u-1' },
      query: { page: '3', size: '7', unread_only: 'true' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyNotifications(req, res, next);

    expect(meServiceMock.getMyNotifications).toHaveBeenCalledWith({
      userId: 'u-1',
      page: 3,
      size: 7,
      unreadOnly: true,
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      items: [{ id: 'n-1' }],
      page: 3,
      size: 7,
      total: 10,
      unread_total: 4,
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('getMyNotifications handles boolean unread_only and defaults to false', async () => {
    meServiceMock.getMyNotifications.mockResolvedValue({
      items: [],
      page: 1,
      size: 20,
      total: 0,
      unread_total: 0,
    });

    const reqTrue = {
      user: { id: 'u-1' },
      query: { unread_only: true },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.getMyNotifications(reqTrue, res, next);

    expect(meServiceMock.getMyNotifications).toHaveBeenLastCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      unreadOnly: true,
      persona: 'developer',
    });

    const reqDefault = {
      user: { id: 'u-1' },
      query: {},
      persona: 'developer',
    };

    await meController.getMyNotifications(reqDefault, res, next);

    expect(meServiceMock.getMyNotifications).toHaveBeenLastCalledWith({
      userId: 'u-1',
      page: 1,
      size: 20,
      unreadOnly: false,
      persona: 'developer',
    });
  });

  test('markNotificationAsRead maps service result to response', async () => {
    meServiceMock.markNotificationAsRead.mockResolvedValue({
      id: 'n-1',
      read_at: '2026-03-08T10:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      params: { id: 'n-1' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markNotificationAsRead(req, res, next);

    expect(meServiceMock.markNotificationAsRead).toHaveBeenCalledWith({
      userId: 'u-1',
      notificationId: 'n-1',
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('markAllNotificationsAsRead maps service result to response', async () => {
    meServiceMock.markAllNotificationsAsRead.mockResolvedValue({
      updated: 5,
      read_at: '2026-03-08T11:00:00.000Z',
    });

    const req = {
      user: { id: 'u-1' },
      persona: 'company',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markAllNotificationsAsRead(req, res, next);

    expect(meServiceMock.markAllNotificationsAsRead).toHaveBeenCalledWith({
      userId: 'u-1',
      persona: 'company',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      updated: 5,
      read_at: '2026-03-08T11:00:00.000Z',
    });
  });

  test('markNotificationAsUnread maps service result to response', async () => {
    meServiceMock.markNotificationAsUnread.mockResolvedValue({
      id: 'n-1',
      read_at: null,
    });

    const req = {
      user: { id: 'u-1' },
      params: { id: 'n-1' },
      persona: 'developer',
    };
    const res = createResponseMock();
    const next = jest.fn();

    await meController.markNotificationAsUnread(req, res, next);

    expect(meServiceMock.markNotificationAsUnread).toHaveBeenCalledWith({
      userId: 'u-1',
      notificationId: 'n-1',
      persona: 'developer',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      id: 'n-1',
      read_at: null,
    });
  });
});
