import {
  calculateBackoffDelayMs,
  isRecoverableEmailError,
  isThrottleEmailError,
  parseRetryAfterMs,
} from '../../../src/services/email-outbox/retry-policy.js';

describe('email outbox retry policy', () => {
  test('recognizes throttling by status code', () => {
    expect(isThrottleEmailError({ statusCode: 429 })).toBe(true);
    expect(isThrottleEmailError({ responseCode: 451 })).toBe(true);
    expect(isThrottleEmailError({ message: 'rate limit exceeded' })).toBe(true);
  });

  test('marks network errors as recoverable', () => {
    expect(isRecoverableEmailError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isRecoverableEmailError({ code: 'ECONNRESET' })).toBe(true);
    expect(isRecoverableEmailError({ responseCode: 550 })).toBe(false);
  });

  test('parses retry-after from structured and textual error payloads', () => {
    expect(parseRetryAfterMs({ retryAfterSeconds: 12 })).toBe(12000);
    expect(parseRetryAfterMs({ message: 'Retry-After: 9' })).toBe(9000);
    expect(parseRetryAfterMs({ message: 'no retry header' })).toBeNull();
  });

  test('applies exponential backoff and honors retry-after floor', () => {
    const originalRandom = Math.random;
    Math.random = () => 0;

    try {
      const delay = calculateBackoffDelayMs({
        attempt: 3,
        baseDelayMs: 5000,
        maxDelayMs: 60000,
        retryAfterMs: 30000,
        jitterRatio: 0.3,
      });

      expect(delay).toBe(30000);
    } finally {
      Math.random = originalRandom;
    }
  });
});
