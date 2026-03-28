import { createHash } from 'node:crypto';
import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

const PUBLIC_PROJECTS_CATALOG_PREFIX = 'projects:catalog:public:';

function normalizePublicProjectsQuery(query) {
  return {
    page: Number(query.page || 1),
    size: Number(query.size || 20),
    search: query.search || '',
    visibility: query.visibility || null,
  };
}

function buildPublicProjectsCatalogKey(query) {
  const normalized = normalizePublicProjectsQuery(query);
  const hash = createHash('sha1').update(JSON.stringify(normalized)).digest('hex');
  return `${PUBLIC_PROJECTS_CATALOG_PREFIX}${hash}`;
}

export async function getCachedPublicProjectsCatalog(query) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const raw = await client.get(buildPublicProjectsCatalogKey(query));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error('Failed to read cached public projects catalog:', error.message);
    return null;
  }
}

export async function setCachedPublicProjectsCatalog(query, value, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  const finalTtl = ttlSeconds ?? env.projectsCatalogPublicCacheTtlSeconds;

  try {
    await client.setEx(buildPublicProjectsCatalogKey(query), finalTtl, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Failed to cache public projects catalog:', error.message);
    return false;
  }
}

export async function invalidateCachedPublicProjectsCatalog() {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    const keys = [];

    if (typeof client.scanIterator === 'function') {
      for await (const key of client.scanIterator({
        MATCH: `${PUBLIC_PROJECTS_CATALOG_PREFIX}*`,
      })) {
        keys.push(key);
      }
    } else {
      const listed = await client.keys(`${PUBLIC_PROJECTS_CATALOG_PREFIX}*`);
      keys.push(...listed);
    }

    if (keys.length === 0) return false;

    await client.del(keys);
    return true;
  } catch (error) {
    console.error('Failed to invalidate public projects catalog cache:', error.message);
    return false;
  }
}
