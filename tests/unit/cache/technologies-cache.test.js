import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    technologySearchCacheTtlSeconds: 300,
    technologyByIdCacheTtlSeconds: 3600,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedTechnologySearch,
  setCachedTechnologySearch,
  getCachedTechnologyById,
  setCachedTechnologyById,
  getCachedTechnologiesByIds,
  setCachedTechnologiesByIds,
} = await import('../../../src/cache/technologies.js');

describe('cache/technologies', () => {
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

    await expect(getCachedTechnologySearch({ q: 're', limit: 5, activeOnly: true })).resolves.toBe(
      null
    );
    await expect(
      setCachedTechnologySearch({ q: 're', limit: 5, activeOnly: true }, { items: [] })
    ).resolves.toBe(false);
    await expect(getCachedTechnologyById('tech1')).resolves.toBeNull();
    await expect(setCachedTechnologyById('tech1', { id: 'tech1' })).resolves.toBe(false);
  });

  it('stores and reads search cache entries', async () => {
    const payload = { items: [{ id: 'tech1', name: 'Redis' }] };

    await expect(
      setCachedTechnologySearch({ q: 're', type: 'BACKEND', limit: 5, activeOnly: true }, payload)
    ).resolves.toBe(true);

    await expect(
      getCachedTechnologySearch({ q: 're', type: 'BACKEND', limit: 5, activeOnly: true })
    ).resolves.toEqual(payload);
  });

  it('stores and reads by-id and by-ids cache entries', async () => {
    await expect(setCachedTechnologyById('tech2', { id: 'tech2', name: 'Node.js' })).resolves.toBe(
      true
    );
    await expect(getCachedTechnologyById('tech2')).resolves.toEqual({
      id: 'tech2',
      name: 'Node.js',
    });

    const batch = [{ id: 'tech1' }, { id: 'tech2' }];
    await expect(setCachedTechnologiesByIds(['tech2', 'tech1'], batch)).resolves.toBe(true);
    await expect(getCachedTechnologiesByIds(['tech1', 'tech2'])).resolves.toEqual(batch);
  });
});
