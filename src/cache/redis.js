import { createClient } from 'redis';
import { setTimeout as delay } from 'node:timers/promises';
import { env } from '../config/env.js';

let redisClient = null;

function createRedisClient() {
  return createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: env.redisConnectTimeoutMs,
      // Startup is bounded by connectRedis retries, so avoid endless reconnect loops.
      reconnectStrategy: () => false,
    },
  });
}

export async function connectRedis() {
  if (!env.redisEnabled) {
    console.log('Redis disabled (REDIS_ENABLED=false)');
    return null;
  }

  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const maxAttempts = Math.max(1, env.redisStartupRetries);
  const retryDelayMs = Math.max(0, env.redisRetryDelayMs);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptClient = createRedisClient();
    attemptClient.on('error', (error) => {
      console.error('Redis error:', error.message);
    });

    try {
      await attemptClient.connect();
      await attemptClient.ping();

      redisClient = attemptClient;
      console.log(`✓ Redis connected: ${env.redisUrl}`);
      return redisClient;
    } catch (error) {
      const isLastAttempt = attempt >= maxAttempts;
      const message = error?.message ?? 'Unknown error';

      // Ensure failed attempt does not keep reconnecting in the background.
      try {
        if (attemptClient.isOpen) {
          await attemptClient.quit();
        }
      } catch {
        // No-op: we only need best-effort cleanup for failed startup attempts.
      }

      if (isLastAttempt) {
        if (env.redisRequired) {
          throw new Error(
            `Redis is required but unavailable after ${maxAttempts} attempt(s). Last error: ${message}`
          );
        }

        console.warn(
          `Redis unavailable after ${maxAttempts} attempt(s). Continuing without cache. Last error: ${message}`
        );
        redisClient = null;
        return null;
      }

      console.warn(
        `Redis connection attempt ${attempt}/${maxAttempts} failed: ${message}. Retrying in ${retryDelayMs}ms...`
      );
      await delay(retryDelayMs);
    }
  }

  return null;
}

export function getRedisClient() {
  return redisClient;
}

export async function disconnectRedis() {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    console.log('Redis disconnected');
  }
}
