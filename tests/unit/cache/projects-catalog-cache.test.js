import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    projectsCatalogPublicCacheTtlSeconds: 90,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedPublicProjectsCatalog,
  setCachedPublicProjectsCatalog,
  invalidateCachedPublicProjectsCatalog,
} = await import('../../../src/cache/projects-catalog.js');

describe('cache/projects-catalog', () => {
  let redis;

  const query = {
    page: 1,
    size: 20,
    search: 'teamup',
    visibility: 'PUBLIC',
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

    await expect(getCachedPublicProjectsCatalog(query)).resolves.toBeNull();
    await expect(setCachedPublicProjectsCatalog(query, { items: [] })).resolves.toBe(false);
    await expect(invalidateCachedPublicProjectsCatalog()).resolves.toBe(false);
  });

  it('stores and reads public projects catalog payload', async () => {
    const payload = { items: [{ project_id: 'p1' }], page: 1, size: 20, total: 1 };

    await expect(setCachedPublicProjectsCatalog(query, payload)).resolves.toBe(true);
    await expect(getCachedPublicProjectsCatalog(query)).resolves.toEqual(payload);
  });

  it('invalidates all public projects catalog keys by prefix', async () => {
    await setCachedPublicProjectsCatalog(query, {
      items: [{ project_id: 'p1' }],
      page: 1,
      size: 20,
      total: 1,
    });
    await setCachedPublicProjectsCatalog(
      { ...query, page: 2 },
      { items: [], page: 2, size: 20, total: 0 }
    );

    await expect(invalidateCachedPublicProjectsCatalog()).resolves.toBe(true);
    await expect(getCachedPublicProjectsCatalog(query)).resolves.toBeNull();
    await expect(getCachedPublicProjectsCatalog({ ...query, page: 2 })).resolves.toBeNull();
  });
});
