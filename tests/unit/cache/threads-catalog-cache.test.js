import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    threadsCatalogCacheTtlSeconds: 30,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const { getCachedMyThreadsCatalog, setCachedMyThreadsCatalog, invalidateCachedMyThreadsCatalog } =
  await import('../../../src/cache/threads-catalog.js');

describe('cache/threads-catalog', () => {
  let redis;

  const query = {
    userId: 'u1',
    persona: 'developer',
    page: 1,
    size: 20,
    search: 'api',
    importantOnly: false,
  };

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

    await expect(getCachedMyThreadsCatalog(query)).resolves.toBeNull();
    await expect(setCachedMyThreadsCatalog(query, { items: [] })).resolves.toBe(false);
    await expect(invalidateCachedMyThreadsCatalog('u1')).resolves.toBe(false);
  });

  it('stores and reads my threads payload', async () => {
    const payload = { items: [{ thread_id: 'th1' }], page: 1, size: 20, total: 1 };

    await expect(setCachedMyThreadsCatalog(query, payload)).resolves.toBe(true);
    await expect(getCachedMyThreadsCatalog(query)).resolves.toEqual(payload);
  });

  it('invalidates cached user thread catalog by prefix', async () => {
    await setCachedMyThreadsCatalog(query, {
      items: [{ thread_id: 'th1' }],
      page: 1,
      size: 20,
      total: 1,
    });
    await setCachedMyThreadsCatalog(
      { ...query, importantOnly: true },
      {
        items: [],
        page: 1,
        size: 20,
        total: 0,
      }
    );

    await expect(invalidateCachedMyThreadsCatalog('u1')).resolves.toBe(true);
    await expect(getCachedMyThreadsCatalog(query)).resolves.toBeNull();
    await expect(getCachedMyThreadsCatalog({ ...query, importantOnly: true })).resolves.toBeNull();
  });
});
