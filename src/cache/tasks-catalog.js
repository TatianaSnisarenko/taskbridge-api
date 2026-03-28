import { createHash } from 'node:crypto';
import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

const PUBLIC_CATALOG_PREFIX = 'tasks:catalog:public:';

function normalizePublicCatalogQuery(query) {
  const technologyIds = [...(query.technology_ids || [])].sort();

  return {
    page: Number(query.page || 1),
    size: Number(query.size || 20),
    search: query.search || '',
    category: query.category || null,
    difficulty: query.difficulty || null,
    type: query.type || null,
    technology_ids: technologyIds,
    tech_match: query.tech_match || 'ANY',
    projectId: query.projectId || null,
  };
}

function buildPublicCatalogCacheKey(query) {
  const normalized = normalizePublicCatalogQuery(query);
  const hash = createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
  return `${PUBLIC_CATALOG_PREFIX}${hash}`;
}

export async function getCachedPublicTasksCatalog(query) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const raw = await client.get(buildPublicCatalogCacheKey(query));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read cached public tasks catalog:', error.message);
    return null;
  }
}

export async function setCachedPublicTasksCatalog(query, value, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  const finalTtl = ttlSeconds ?? env.taskCatalogPublicCacheTtlSeconds;

  try {
    await client.setEx(buildPublicCatalogCacheKey(query), finalTtl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to cache public tasks catalog:', error.message);
    return false;
  }
}

export async function invalidateCachedPublicTasksCatalog() {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    const keys = [];

    if (typeof client.scanIterator === 'function') {
      for await (const key of client.scanIterator({ MATCH: `${PUBLIC_CATALOG_PREFIX}*` })) {
        keys.push(key);
      }
    } else {
      const listed = await client.keys(`${PUBLIC_CATALOG_PREFIX}*`);
      keys.push(...listed);
    }

    if (keys.length === 0) return false;

    await client.del(keys);
    return true;
  } catch (error) {
    console.error('Failed to invalidate public tasks catalog cache:', error.message);
    return false;
  }
}
