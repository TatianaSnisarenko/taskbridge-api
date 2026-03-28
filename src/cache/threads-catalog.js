import { createHash } from 'node:crypto';
import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

const THREADS_CATALOG_PREFIX = 'threads:catalog:';

function normalizeThreadsCatalogQuery({ userId, persona, page, size, search, importantOnly }) {
  return {
    userId,
    persona,
    page: Number(page || 1),
    size: Number(size || 20),
    search: typeof search === 'string' ? search.trim() : '',
    importantOnly: Boolean(importantOnly),
  };
}

function buildThreadsCatalogKey(query) {
  const normalized = normalizeThreadsCatalogQuery(query);
  const hash = createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
  return `${THREADS_CATALOG_PREFIX}${normalized.userId}:${hash}`;
}

function buildUserThreadsPrefix(userId) {
  return `${THREADS_CATALOG_PREFIX}${userId}:`;
}

export async function getCachedMyThreadsCatalog(query) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const raw = await client.get(buildThreadsCatalogKey(query));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read cached threads catalog:', error.message);
    return null;
  }
}

export async function setCachedMyThreadsCatalog(query, value, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  const finalTtl = ttlSeconds ?? env.threadsCatalogCacheTtlSeconds;

  try {
    await client.setEx(buildThreadsCatalogKey(query), finalTtl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to cache threads catalog:', error.message);
    return false;
  }
}

export async function invalidateCachedMyThreadsCatalog(userId) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    const prefix = buildUserThreadsPrefix(userId);
    const keys = [];

    if (typeof client.scanIterator === 'function') {
      for await (const key of client.scanIterator({ MATCH: `${prefix}*` })) {
        keys.push(key);
      }
    } else {
      const listed = await client.keys(`${prefix}*`);
      keys.push(...listed);
    }

    if (keys.length === 0) return false;

    await client.del(keys);
    return true;
  } catch (error) {
    console.error('Failed to invalidate cached threads catalog:', error.message);
    return false;
  }
}
