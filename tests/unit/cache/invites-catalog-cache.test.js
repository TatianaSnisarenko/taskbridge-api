import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    invitesCatalogCacheTtlSeconds: 45,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedTaskInvites,
  setCachedTaskInvites,
  getCachedMyInvites,
  setCachedMyInvites,
  invalidateCachedTaskInvites,
  invalidateCachedMyInvites,
} = await import('../../../src/cache/invites-catalog.js');

describe('cache/invites-catalog', () => {
  let redis;

  beforeEach(() => {
    redis = createMockRedisClient();
    redisModuleMock.getRedisClient.mockReturnValue(redis);
    redis.keys = jest.fn(async (pattern) => {
      const prefix = pattern.replace('*', '');
      return redis.getAllKeys().filter((key) => key.startsWith(prefix));
    });
  });

  afterEach(() => {
    redis.clear();
    jest.clearAllMocks();
  });

  it('returns null/false when redis is unavailable', async () => {
    redisModuleMock.getRedisClient.mockReturnValue(null);

    await expect(getCachedTaskInvites({ taskId: 't1', page: 1, size: 20 })).resolves.toBeNull();
    await expect(
      setCachedTaskInvites({ taskId: 't1', page: 1, size: 20 }, { items: [] })
    ).resolves.toBe(false);
    await expect(getCachedMyInvites({ userId: 'u1', page: 1, size: 20 })).resolves.toBeNull();
    await expect(
      setCachedMyInvites({ userId: 'u1', page: 1, size: 20 }, { items: [] })
    ).resolves.toBe(false);
  });

  it('stores and reads task invites and my invites payloads', async () => {
    const taskPayload = { items: [{ invite_id: 'inv1' }], page: 1, size: 20, total: 1 };
    const myPayload = { items: [{ invite_id: 'inv2' }], page: 1, size: 20, total: 1 };

    await expect(
      setCachedTaskInvites({ taskId: 't1', page: 1, size: 20 }, taskPayload)
    ).resolves.toBe(true);
    await expect(setCachedMyInvites({ userId: 'u1', page: 1, size: 20 }, myPayload)).resolves.toBe(
      true
    );

    await expect(getCachedTaskInvites({ taskId: 't1', page: 1, size: 20 })).resolves.toEqual(
      taskPayload
    );
    await expect(getCachedMyInvites({ userId: 'u1', page: 1, size: 20 })).resolves.toEqual(
      myPayload
    );
  });

  it('invalidates task and my invites caches by prefix', async () => {
    await setCachedTaskInvites(
      { taskId: 't1', page: 1, size: 20 },
      { items: [{ invite_id: 'inv1' }] }
    );
    await setCachedTaskInvites({ taskId: 't1', page: 2, size: 20 }, { items: [] });
    await setCachedMyInvites(
      { userId: 'u1', page: 1, size: 20 },
      { items: [{ invite_id: 'inv2' }] }
    );

    await expect(invalidateCachedTaskInvites('t1')).resolves.toBe(true);
    await expect(invalidateCachedMyInvites('u1')).resolves.toBe(true);

    await expect(getCachedTaskInvites({ taskId: 't1', page: 1, size: 20 })).resolves.toBeNull();
    await expect(getCachedMyInvites({ userId: 'u1', page: 1, size: 20 })).resolves.toBeNull();
  });
});
