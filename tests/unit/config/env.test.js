import { jest } from '@jest/globals';

const baseEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_ACCESS_SECRET: 'secret',
  EMAIL_ADDRESS: 'test@example.com',
  EMAIL_PASSWORD: 'password',
  EMAIL_HOST: 'smtp.test',
};

async function loadEnv(overrides) {
  jest.resetModules();

  jest.unstable_mockModule('dotenv', () => ({
    default: { config: jest.fn() },
    config: jest.fn(),
  }));

  process.env = { ...baseEnv, ...overrides };

  const { env } = await import('../../../src/config/env.js');
  return env;
}

describe('env config', () => {
  const originalEnv = process.env;

  afterAll(() => {
    process.env = originalEnv;
  });

  test('loads required env vars', async () => {
    const env = await loadEnv();

    expect(env.databaseUrl).toBe(baseEnv.DATABASE_URL);
    expect(env.jwtAccessSecret).toBe(baseEnv.JWT_ACCESS_SECRET);
  });

  test('throws when required env var missing', async () => {
    process.env = { ...baseEnv, DATABASE_URL: '' };
    jest.resetModules();
    jest.unstable_mockModule('dotenv', () => ({
      default: { config: jest.fn() },
      config: jest.fn(),
    }));

    await expect(import('../../../src/config/env.js')).rejects.toThrow(
      'Missing env var: DATABASE_URL'
    );
  });

  test('parses booleans and numbers', async () => {
    const env = await loadEnv({
      COOKIE_SECURE: 'true',
      COOKIE_SAMESITE: 'strict',
      ACCESS_TOKEN_TTL_SECONDS: '1200',
      REFRESH_TOKEN_TTL_DAYS: '10',
      EMAIL_PORT: '2525',
      EMAIL_SECURE: 'false',
      TASK_COMPLETION_RESPONSE_HOURS: '96',
    });

    expect(env.cookieSecure).toBe(true);
    expect(env.cookieSameSite).toBe('strict');
    expect(env.accessTokenTtlSeconds).toBe(1200);
    expect(env.refreshTokenTtlDays).toBe(10);
    expect(env.emailPort).toBe(2525);
    expect(env.emailSecure).toBe(false);
    expect(env.taskCompletionResponseHours).toBe(96);
  });

  test('uses defaults for optional values', async () => {
    const env = await loadEnv({
      PORT: undefined,
      ACCESS_TOKEN_TTL_SECONDS: undefined,
      REFRESH_TOKEN_TTL_DAYS: undefined,
      CLIENT_ORIGIN: undefined,
      COOKIE_SECURE: undefined,
      COOKIE_SAMESITE: undefined,
      EMAIL_PORT: undefined,
      EMAIL_SECURE: undefined,
      APP_BASE_URL: undefined,
      EMAIL_VERIFICATION_TTL_HOURS: undefined,
      VERIFICATION_TOKEN_RETENTION_DAYS: undefined,
      UNVERIFIED_USER_DELETION_AFTER_DAYS: undefined,
      UNVERIFIED_USER_CLEANUP_CRON: undefined,
      TASK_COMPLETION_RESPONSE_HOURS: undefined,
    });

    expect(env.port).toBe(3000);
    expect(env.accessTokenTtlSeconds).toBe(900);
    expect(env.refreshTokenTtlDays).toBe(30);
    expect(env.clientOrigin).toBe('http://localhost:5173');
    expect(env.cookieSecure).toBe(false);
    expect(env.cookieSameSite).toBe('lax');
    expect(env.emailPort).toBe(465);
    expect(env.emailSecure).toBe(true);
    expect(env.appBaseUrl).toBe('http://localhost:3000');
    expect(env.emailVerificationTtlHours).toBe(24);
    expect(env.verificationTokenRetentionDays).toBe(7);
    expect(env.unverifiedUserDeletionAfterDays).toBe(7);
    expect(env.unverifiedUserCleanupCron).toBe('43 3 * * *');
    expect(env.taskCompletionResponseHours).toBe(72);
  });
});
