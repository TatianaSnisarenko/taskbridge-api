import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    notificationUnreadCacheTtlSeconds: 30,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedUnreadNotificationCount,
  setCachedUnreadNotificationCount,
  invalidateCachedUnreadNotificationCount,
} = await import('../../../src/cache/notifications.js');

describe('cache/notifications', () => {
  let redis;

  beforeEach(() => {
    redis = createMockRedisClient();
    redisModuleMock.getRedisClient.mockReturnValue(redis);
  });

  afterEach(() => {
    redis.clear();
    jest.clearAllMocks();
  });

  it('returns null/false when redis is unavailable', async () => {
    redisModuleMock.getRedisClient.mockReturnValue(null);

    await expect(getCachedUnreadNotificationCount('u1')).resolves.toBeNull();
    await expect(setCachedUnreadNotificationCount('u1', 5)).resolves.toBe(false);
    await expect(invalidateCachedUnreadNotificationCount('u1')).resolves.toBe(false);
  });

  it('stores and reads unread count with default ttl', async () => {
    const setExSpy = jest.spyOn(redis, 'setEx');

    await expect(setCachedUnreadNotificationCount('u1', 7)).resolves.toBe(true);
    await expect(getCachedUnreadNotificationCount('u1')).resolves.toBe(7);

    expect(setExSpy).toHaveBeenCalledWith('notifications:unread:u1', 30, '7');
  });

  it('invalidates unread counter key', async () => {
    await setCachedUnreadNotificationCount('u2', 9);
    await expect(getCachedUnreadNotificationCount('u2')).resolves.toBe(9);

    await expect(invalidateCachedUnreadNotificationCount('u2')).resolves.toBe(true);
    await expect(getCachedUnreadNotificationCount('u2')).resolves.toBeNull();
  });
});
