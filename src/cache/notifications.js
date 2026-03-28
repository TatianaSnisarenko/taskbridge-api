import { getRedisClient } from './redis.js';
import { env } from '../config/env.js';

function unreadCacheKey(userId) {
  return `notifications:unread:${userId}`;
}

export async function getCachedUnreadNotificationCount(userId) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return null;

  try {
    const cached = await client.get(unreadCacheKey(userId));
    if (!cached) return null;
    return Number.parseInt(cached, 10);
  } catch (error) {
    console.error(`Failed to get cached unread notifications for user ${userId}:`, error.message);
    return null;
  }
}

export async function setCachedUnreadNotificationCount(userId, count, ttlSeconds) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  const finalTtl = ttlSeconds ?? env.notificationUnreadCacheTtlSeconds;

  try {
    await client.setEx(unreadCacheKey(userId), finalTtl, String(count));
    return true;
  } catch (error) {
    console.error(`Failed to cache unread notifications for user ${userId}:`, error.message);
    return false;
  }
}

export async function invalidateCachedUnreadNotificationCount(userId) {
  const client = getRedisClient();
  if (!client || !client.isOpen) return false;

  try {
    const deleted = await client.del(unreadCacheKey(userId));
    return deleted > 0;
  } catch (error) {
    console.error(
      `Failed to invalidate unread notifications cache for user ${userId}:`,
      error.message
    );
    return false;
  }
}
