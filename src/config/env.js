import dotenv from 'dotenv';

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtAccessSecret: required('JWT_ACCESS_SECRET'),
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  cookieSecure: String(process.env.COOKIE_SECURE ?? 'false').toLowerCase() === 'true',
  cookieSameSite: process.env.COOKIE_SAMESITE ?? 'lax',
  emailAddress: required('EMAIL_ADDRESS'),
  emailPassword: required('EMAIL_PASSWORD'),
  emailHost: required('EMAIL_HOST'),
  emailPort: Number(process.env.EMAIL_PORT ?? 465),
  emailSecure: String(process.env.EMAIL_SECURE ?? 'true').toLowerCase() === 'true',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  emailVerificationTtlHours: Number(process.env.EMAIL_VERIFICATION_TTL_HOURS ?? 24),
  passwordResetTokenTtlMinutes: Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES ?? 30),
  verificationTokenRetentionDays: Number(process.env.VERIFICATION_TOKEN_RETENTION_DAYS ?? 7),
  emailNotificationsEnabled:
    String(process.env.EMAIL_NOTIFICATIONS_ENABLED ?? 'false').toLowerCase() === 'true',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? 'http://localhost:5173',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  platformReviewCooldownDays: Number(process.env.PLATFORM_REVIEW_COOLDOWN_DAYS ?? 30),
  taskCompletionResponseHours: Number(process.env.TASK_COMPLETION_RESPONSE_HOURS ?? 72),
  redisEnabled: String(process.env.REDIS_ENABLED ?? 'false').toLowerCase() === 'true',
  redisRequired: String(process.env.REDIS_REQUIRED ?? 'false').toLowerCase() === 'true',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  redisConnectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS ?? 3000),
  redisStartupRetries: Number(process.env.REDIS_STARTUP_RETRIES ?? 3),
  redisRetryDelayMs: Number(process.env.REDIS_RETRY_DELAY_MS ?? 500),
  candidateCacheTtlSeconds: Number(process.env.CANDIDATE_CACHE_TTL_SECONDS ?? 3600),
  technologySearchCacheTtlSeconds: Number(process.env.TECHNOLOGY_SEARCH_CACHE_TTL_SECONDS ?? 300),
  technologyByIdCacheTtlSeconds: Number(process.env.TECHNOLOGY_BY_ID_CACHE_TTL_SECONDS ?? 3600),
  notificationUnreadCacheTtlSeconds: Number(
    process.env.NOTIFICATION_UNREAD_CACHE_TTL_SECONDS ?? 30
  ),
  taskCatalogPublicCacheTtlSeconds: Number(process.env.TASK_CATALOG_PUBLIC_CACHE_TTL_SECONDS ?? 60),
  projectsCatalogPublicCacheTtlSeconds: Number(
    process.env.PROJECTS_CATALOG_PUBLIC_CACHE_TTL_SECONDS ?? 90
  ),
  invitesCatalogCacheTtlSeconds: Number(process.env.INVITES_CATALOG_CACHE_TTL_SECONDS ?? 45),
  threadsCatalogCacheTtlSeconds: Number(process.env.THREADS_CATALOG_CACHE_TTL_SECONDS ?? 30),
};
