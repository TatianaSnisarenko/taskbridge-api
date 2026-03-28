import {
  meService,
  prismaMock,
  notificationsCacheMock,
  resetMeServiceMocks,
} from './notifications-test-setup.js';

describe('me.service - notifications cache', () => {
  beforeEach(() => {
    resetMeServiceMocks();
  });

  test('uses cached unread count when available', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValue(0);
    notificationsCacheMock.getCachedUnreadNotificationCount.mockResolvedValue(7);

    const result = await meService.getMyNotifications({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(result.unread_total).toBe(7);
    expect(prismaMock.notification.count).toHaveBeenCalledTimes(1);
    expect(notificationsCacheMock.setCachedUnreadNotificationCount).not.toHaveBeenCalled();
  });

  test('loads and stores unread count on cache miss', async () => {
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(4);

    const result = await meService.getMyNotifications({
      userId: 'u1',
      persona: 'developer',
      page: 1,
      size: 20,
    });

    expect(result.unread_total).toBe(4);
    expect(notificationsCacheMock.setCachedUnreadNotificationCount).toHaveBeenCalledWith('u1', 4);
  });
});
