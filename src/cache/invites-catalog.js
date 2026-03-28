import { createHash } from 'node:crypto';
import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

const TASK_INVITES_PREFIX = 'invites:task:';
const MY_INVITES_PREFIX = 'invites:my:';

function taskInvitesKey({ taskId, page, size, status }) {
  return `${TASK_INVITES_PREFIX}${taskId}:${Number(page || 1)}:${Number(size || 20)}:${status || 'ALL'}`;
}

function myInvitesKey({ userId, page, size, status }) {
  return `${MY_INVITES_PREFIX}${userId}:${Number(page || 1)}:${Number(size || 20)}:${status || 'ALL'}`;
}

function userInvitesPrefix(userId) {
  return `${MY_INVITES_PREFIX}${userId}:`;
}

async function getJson(key) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Failed to read invites cache key ${key}:`, error.message);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to write invites cache key ${key}:`, error.message);
    return false;
  }
}

async function invalidateByPrefix(prefix) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
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
    console.error(`Failed to invalidate invites cache by prefix ${prefix}:`, error.message);
    return false;
  }
}

export async function getCachedTaskInvites(params) {
  return getJson(taskInvitesKey(params));
}

export async function setCachedTaskInvites(params, value, ttlSeconds) {
  const finalTtl = ttlSeconds ?? env.invitesCatalogCacheTtlSeconds;
  return setJson(taskInvitesKey(params), value, finalTtl);
}

export async function getCachedMyInvites(params) {
  return getJson(myInvitesKey(params));
}

export async function setCachedMyInvites(params, value, ttlSeconds) {
  const finalTtl = ttlSeconds ?? env.invitesCatalogCacheTtlSeconds;
  return setJson(myInvitesKey(params), value, finalTtl);
}

export async function invalidateCachedTaskInvites(taskId) {
  return invalidateByPrefix(`${TASK_INVITES_PREFIX}${taskId}:`);
}

export async function invalidateCachedMyInvites(userId) {
  return invalidateByPrefix(userInvitesPrefix(userId));
}

export function buildInvitesCatalogBatchToken(taskId, userId) {
  return createHash('sha1').update(`${taskId}:${userId}`).digest('hex');
}
