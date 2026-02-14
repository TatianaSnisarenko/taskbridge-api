import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config({ path: '.env.test' });

const statePath = path.join(process.cwd(), 'tests', '.tmp', 'testcontainer-state.json');
if (fs.existsSync(statePath)) {
  try {
    const raw = fs.readFileSync(statePath, 'utf8');
    const state = JSON.parse(raw);
    if (state?.databaseUrl) {
      process.env.DATABASE_URL = state.databaseUrl;
    }
  } catch {
    // Ignore missing/invalid state file.
  }
}

process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? 'test-secret';
process.env.ACCESS_TOKEN_TTL_SECONDS = process.env.ACCESS_TOKEN_TTL_SECONDS ?? '900';
process.env.REFRESH_TOKEN_TTL_DAYS = process.env.REFRESH_TOKEN_TTL_DAYS ?? '30';
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
process.env.COOKIE_SECURE = process.env.COOKIE_SECURE ?? 'false';
process.env.COOKIE_SAMESITE = process.env.COOKIE_SAMESITE ?? 'lax';
process.env.EMAIL_ADDRESS = process.env.EMAIL_ADDRESS ?? 'test@example.com';
process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD ?? 'test-password';
process.env.EMAIL_HOST = process.env.EMAIL_HOST ?? 'localhost';
process.env.EMAIL_PORT = process.env.EMAIL_PORT ?? '1025';
process.env.EMAIL_SECURE = process.env.EMAIL_SECURE ?? 'false';
process.env.APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';
process.env.EMAIL_VERIFICATION_TTL_HOURS = process.env.EMAIL_VERIFICATION_TTL_HOURS ?? '24';
process.env.VERIFICATION_TOKEN_RETENTION_DAYS =
  process.env.VERIFICATION_TOKEN_RETENTION_DAYS ?? '7';
