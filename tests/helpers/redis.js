/**
 * Mock Redis client for testing
 * Provides in-memory cache implementation for testing without real Redis
 */

class MockRedisClient {
  constructor() {
    this.data = new Map();
    this.isOpen = true;
    this.expirations = new Map();
  }

  async connect() {
    this.isOpen = true;
    return this;
  }

  async ping() {
    return 'PONG';
  }

  async get(key) {
    // Check if key has expired
    if (this.expirations.has(key)) {
      const expiresAt = this.expirations.get(key);
      if (Date.now() > expiresAt) {
        this.data.delete(key);
        this.expirations.delete(key);
        return null;
      }
    }

    return this.data.get(key) ?? null;
  }

  async setEx(key, seconds, value) {
    this.data.set(key, value);
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 'OK';
  }

  async del(keys) {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    let deletedCount = 0;

    for (const key of keysArray) {
      if (this.data.has(key)) {
        this.data.delete(key);
        this.expirations.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async quit() {
    this.isOpen = false;
    this.data.clear();
    this.expirations.clear();
  }

  on() {
    // No-op for mock
  }

  // Helper method for testing: clear all data
  clear() {
    this.data.clear();
    this.expirations.clear();
  }

  // Helper method for testing: get all cached keys
  getAllKeys() {
    return Array.from(this.data.keys());
  }

  // Helper method for testing: check if TTL is set correctly
  getExpiration(key) {
    return this.expirations.get(key) ?? null;
  }
}

export { MockRedisClient };

/**
 * Create a new mock Redis client for testing
 * @returns {MockRedisClient} Ready-to-use mock Redis client
 */
export function createMockRedisClient() {
  return new MockRedisClient();
}
