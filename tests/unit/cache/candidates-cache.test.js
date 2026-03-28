import { jest } from '@jest/globals';
import { createMockRedisClient } from '../../helpers/redis.js';

const redisModuleMock = {
  getRedisClient: jest.fn(),
};

const envModuleMock = {
  env: {
    candidateCacheTtlSeconds: 3600,
  },
};

jest.unstable_mockModule('../../src/cache/redis.js', () => redisModuleMock);
jest.unstable_mockModule('../../src/config/env.js', () => envModuleMock);

const {
  getCachedCandidateCount,
  setCachedCandidateCount,
  invalidateCachedCandidateCount,
  invalidateCachedCandidateCounts,
} = await import('../../../src/cache/candidates.js');

describe('cache/candidates', () => {
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

    await expect(getCachedCandidateCount('task-1')).resolves.toBeNull();
    await expect(setCachedCandidateCount('task-1', 10)).resolves.toBe(false);
    await expect(invalidateCachedCandidateCount('task-1')).resolves.toBe(false);
    await expect(invalidateCachedCandidateCounts(['task-1'])).resolves.toBe(false);
  });

  it('stores and reads candidate count', async () => {
    await expect(setCachedCandidateCount('task-1', 15)).resolves.toBe(true);
    await expect(getCachedCandidateCount('task-1')).resolves.toBe(15);
  });

  it('returns null for missing key', async () => {
    await expect(getCachedCandidateCount('missing')).resolves.toBeNull();
  });

  it('uses default TTL from env when not provided', async () => {
    const setExSpy = jest.spyOn(redis, 'setEx');

    await setCachedCandidateCount('task-ttl-default', 7);

    expect(setExSpy).toHaveBeenCalledWith('candidates:count:task-ttl-default', 3600, '7');
  });

  it('uses explicit TTL when provided', async () => {
    const setExSpy = jest.spyOn(redis, 'setEx');

    await setCachedCandidateCount('task-ttl-custom', 9, 120);

    expect(setExSpy).toHaveBeenCalledWith('candidates:count:task-ttl-custom', 120, '9');
  });

  it('invalidates single key', async () => {
    await setCachedCandidateCount('task-2', 33);
    await expect(getCachedCandidateCount('task-2')).resolves.toBe(33);

    await expect(invalidateCachedCandidateCount('task-2')).resolves.toBe(true);
    await expect(getCachedCandidateCount('task-2')).resolves.toBeNull();
  });

  it('invalidates multiple keys', async () => {
    await setCachedCandidateCount('task-a', 1);
    await setCachedCandidateCount('task-b', 2);

    await expect(invalidateCachedCandidateCounts(['task-a', 'task-b'])).resolves.toBe(true);
    await expect(getCachedCandidateCount('task-a')).resolves.toBeNull();
    await expect(getCachedCandidateCount('task-b')).resolves.toBeNull();
  });

  it('returns false for empty invalidation list', async () => {
    await expect(invalidateCachedCandidateCounts([])).resolves.toBe(false);
  });

  it('expires values by ttl', async () => {
    await setCachedCandidateCount('task-expire', 44, 1);
    await expect(getCachedCandidateCount('task-expire')).resolves.toBe(44);

    await new Promise((resolve) => globalThis.setTimeout(resolve, 1100));

    await expect(getCachedCandidateCount('task-expire')).resolves.toBeNull();
  });

  it('returns null when get throws', async () => {
    redis.get = jest.fn().mockRejectedValue(new Error('redis get failed'));

    await expect(getCachedCandidateCount('task-err-get')).resolves.toBeNull();
  });

  it('returns false when setEx throws', async () => {
    redis.setEx = jest.fn().mockRejectedValue(new Error('redis set failed'));

    await expect(setCachedCandidateCount('task-err-set', 10)).resolves.toBe(false);
  });

  it('returns false when single del throws', async () => {
    redis.del = jest.fn().mockRejectedValue(new Error('redis del failed'));

    await expect(invalidateCachedCandidateCount('task-err-del')).resolves.toBe(false);
  });

  it('returns false when batch del throws', async () => {
    redis.del = jest.fn().mockRejectedValue(new Error('redis del failed'));

    await expect(invalidateCachedCandidateCounts(['task-a', 'task-b'])).resolves.toBe(false);
  });
});
