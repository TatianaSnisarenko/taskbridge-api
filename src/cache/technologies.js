import { createHash } from 'node:crypto';
import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

function hashIds(ids) {
  return createHash('sha1').update(ids.join('|')).digest('hex');
}

function searchCacheKey({ q, type, limit, activeOnly }) {
  const normalizedQuery = (q ?? '').trim().toLowerCase();
  const normalizedType = type ?? 'ALL';
  const normalizedActiveOnly = activeOnly ? '1' : '0';

  return [
    'technologies',
    'search',
    normalizedType,
    normalizedActiveOnly,
    String(limit),
    normalizedQuery,
  ].join(':');
}

function byIdCacheKey(id) {
  return `technologies:by-id:${id}`;
}

function byIdsCacheKey(ids) {
  const sorted = [...ids].sort();
  return `technologies:by-ids:${hashIds(sorted)}`;
}

async function getJson(cacheKey) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const raw = await client.get(cacheKey);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read technologies cache key ${cacheKey}:`, error.message);
    return null;
  }
}

async function setJson(cacheKey, value, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    await client.setEx(cacheKey, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write technologies cache key ${cacheKey}:`, error.message);
    return false;
  }
}

export async function getCachedTechnologySearch(params) {
  return getJson(searchCacheKey(params));
}

export async function setCachedTechnologySearch(params, value, ttlSeconds) {
  const finalTtl = ttlSeconds ?? env.technologySearchCacheTtlSeconds;
  return setJson(searchCacheKey(params), value, finalTtl);
}

export async function getCachedTechnologyById(id) {
  return getJson(byIdCacheKey(id));
}

export async function setCachedTechnologyById(id, value, ttlSeconds) {
  const finalTtl = ttlSeconds ?? env.technologyByIdCacheTtlSeconds;
  return setJson(byIdCacheKey(id), value, finalTtl);
}

export async function getCachedTechnologiesByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return getJson(byIdsCacheKey(ids));
}

export async function setCachedTechnologiesByIds(ids, value, ttlSeconds) {
  if (!ids || ids.length === 0) return false;
  const finalTtl = ttlSeconds ?? env.technologyByIdCacheTtlSeconds;
  return setJson(byIdsCacheKey(ids), value, finalTtl);
}
