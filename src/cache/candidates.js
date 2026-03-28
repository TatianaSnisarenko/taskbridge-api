import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

/**
 * Redis key pattern for candidate count cache per task
 * Key format: candidates:count:{taskId}
 */
function getCacheKey(taskId) {
  return `candidates:count:${taskId}`;
}

/**
 * Get cached candidate count for a task
 * @param {string} taskId - Task ID
 * @returns {Promise<number|null>} Cached count or null if not found/expired
 */
export async function getCachedCandidateCount(taskId) {
  const client = getRedisClient();

  if (!client || !client.isOpen) {
    return null;
  }

  try {
    const cacheKey = getCacheKey(taskId);
    const cached = await client.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    return null;
  } catch (error) {
    console.error(`Failed to get cached candidate count for task ${taskId}:`, error.message);
    return null;
  }
}

/**
 * Cache candidate count for a task with TTL
 * @param {string} taskId - Task ID
 * @param {number} count - Candidate count to cache
 * @param {number} ttlSeconds - Time to live in seconds (uses env.candidateCacheTtlSeconds if not provided)
 * @returns {Promise<boolean>} True if cached successfully
 */
export async function setCachedCandidateCount(taskId, count, ttlSeconds) {
  const client = getRedisClient();

  if (!client || !client.isOpen) {
    return false;
  }

  const finalTtl = ttlSeconds ?? env.candidateCacheTtlSeconds;

  try {
    const cacheKey = getCacheKey(taskId);
    await client.setEx(cacheKey, finalTtl, String(count));

    return true;
  } catch (error) {
    console.error(`Failed to cache candidate count for task ${taskId}:`, error.message);
    return false;
  }
}

/**
 * Invalidate (clear) candidate count cache for a task
 * Useful when task is updated, applications/invites are modified, etc
 * @param {string} taskId - Task ID
 * @returns {Promise<boolean>} True if invalidated successfully
 */
export async function invalidateCachedCandidateCount(taskId) {
  const client = getRedisClient();

  if (!client || !client.isOpen) {
    return false;
  }

  try {
    const cacheKey = getCacheKey(taskId);
    const deleted = await client.del(cacheKey);

    if (deleted > 0) {
      console.log(`Cache invalidated for task ${taskId}`);
    }

    return deleted > 0;
  } catch (error) {
    console.error(`Failed to invalidate candidate count cache for task ${taskId}:`, error.message);
    return false;
  }
}

/**
 * Batch invalidate candidate count cache for multiple tasks
 * @param {string[]} taskIds - Array of task IDs
 * @returns {Promise<boolean>} True if any were invalidated
 */
export async function invalidateCachedCandidateCounts(taskIds) {
  const client = getRedisClient();

  if (!client || !client.isOpen || taskIds.length === 0) {
    return false;
  }

  try {
    const cacheKeys = taskIds.map(getCacheKey);
    const deleted = await client.del(cacheKeys);

    if (deleted > 0) {
      console.log(`Cache invalidated for ${deleted} task(s)`);
    }

    return deleted > 0;
  } catch (error) {
    console.error(`Failed to batch invalidate candidate count cache:`, error.message);
    return false;
  }
}
