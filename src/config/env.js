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
  verificationTokenRetentionDays: Number(process.env.VERIFICATION_TOKEN_RETENTION_DAYS ?? 7),
  emailNotificationsEnabled:
    String(process.env.EMAIL_NOTIFICATIONS_ENABLED ?? 'false').toLowerCase() === 'true',
  frontendBaseUrl: process.env.FRONTEND_BASE_URL ?? 'http://localhost:3000/api/v1/docs',
};
