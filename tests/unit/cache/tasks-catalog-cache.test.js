import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    taskCatalogPublicCacheTtlSeconds: 60,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedPublicTasksCatalog,
  setCachedPublicTasksCatalog,
  invalidateCachedPublicTasksCatalog,
} = await import('../../../src/cache/tasks-catalog.js');

describe('cache/tasks-catalog', () => {
  let redis;

  const query = {
    page: 1,
    size: 20,
    search: 'react',
    category: 'FRONTEND',
    technology_ids: ['tech1'],
    tech_match: 'ANY',
  };

  beforeEach(() => {
    redis = createMockRedisClient();
    redisModuleMock.getRedisClient.mockReturnValue(redis);
    redis.keys = jest.fn(async () => redis.getAllKeys());
  });

  afterEach(() => {
    redis.clear();
    jest.clearAllMocks();
  });

  it('returns null/false when redis is unavailable', async () => {
    redisModuleMock.getRedisClient.mockReturnValue(null);

    await expect(getCachedPublicTasksCatalog(query)).resolves.toBeNull();
    await expect(setCachedPublicTasksCatalog(query, { items: [] })).resolves.toBe(false);
    await expect(invalidateCachedPublicTasksCatalog()).resolves.toBe(false);
  });

  it('stores and reads public catalog payload', async () => {
    const payload = { items: [{ task_id: 't1' }], page: 1, size: 20, total: 1 };

    await expect(setCachedPublicTasksCatalog(query, payload)).resolves.toBe(true);
    await expect(getCachedPublicTasksCatalog(query)).resolves.toEqual(payload);
  });

  it('invalidates all public catalog keys by prefix', async () => {
    await setCachedPublicTasksCatalog(query, {
      items: [{ task_id: 't1' }],
      page: 1,
      size: 20,
      total: 1,
    });
    await setCachedPublicTasksCatalog(
      { ...query, page: 2 },
      { items: [], page: 2, size: 20, total: 0 }
    );

    await expect(invalidateCachedPublicTasksCatalog()).resolves.toBe(true);
    await expect(getCachedPublicTasksCatalog(query)).resolves.toBeNull();
    await expect(getCachedPublicTasksCatalog({ ...query, page: 2 })).resolves.toBeNull();
  });
});
