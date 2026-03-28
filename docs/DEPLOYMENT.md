# Deployment Guide

[Back to README](../README.md)

This document describes deployment assets and operational checks currently present in the repository.

## What the repository already provides

Deployment-related components in this repo:

- multi-stage `Dockerfile`
- `docker/entrypoint.sh` that runs `prisma migrate deploy` before startup
- environment-based runtime configuration in `src/config/env.js`
- production `npm start` flow with Prisma prestart hooks
- GitHub Actions workflow for lint, tests, and coverage on pull requests to `main`

## Production checklist

Before deployment, make sure you have set:

- `NODE_ENV=production`
- a valid production `DATABASE_URL`
- a strong `JWT_ACCESS_SECRET`
- correct `APP_BASE_URL` and `FRONTEND_BASE_URL`
- correct `CLIENT_ORIGIN`
- working SMTP credentials
- `COOKIE_SECURE=true` behind HTTPS
- Cloudinary credentials if profile media uploads are needed

Important: current env loader requires SMTP variables even if email notifications are disabled.

## Docker image

### Build

```bash
docker build -t teamup-backend:latest .
```

Example with explicit platform (optional):

```bash
docker build --platform linux/amd64 -t teamup-backend:latest .
```

### What the Dockerfile does

The Dockerfile uses three stages:

1. `deps` installs production dependencies
2. `build` generates Prisma client
3. `runtime` copies only the runtime assets

The container entrypoint runs:

```text
prisma migrate deploy
```

before launching the application command.

At runtime, `docker/entrypoint.sh` executes `prisma migrate deploy`, then starts `node src/server.js`.

### Run

```bash
docker run -d \
  --name teamup-api \
  -p 3000:3000 \
  --env-file .env.production \
  teamup-backend:latest
```

## Required runtime environment

At minimum, production deployments should provide:

```text
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
CLIENT_ORIGIN=https://your-frontend.example
APP_BASE_URL=https://your-api.example
FRONTEND_BASE_URL=https://your-frontend.example
EMAIL_ADDRESS=...
EMAIL_PASSWORD=...
EMAIL_HOST=...
```

Depending on your feature usage, also configure:

- `EMAIL_NOTIFICATIONS_ENABLED`
- `EMAIL_OUTBOX_ENABLED`
- `EMAIL_OUTBOX_WORKER_CRON`
- `EMAIL_OUTBOX_CLEANUP_CRON`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `REDIS_ENABLED`, `REDIS_REQUIRED`, `REDIS_URL`
- cache TTL settings (`*_CACHE_TTL_SECONDS`)
- `PLATFORM_REVIEW_COOLDOWN_DAYS`
- `TASK_COMPLETION_RESPONSE_HOURS`
- `EMAIL_VERIFICATION_TTL_HOURS`
- `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `VERIFICATION_TOKEN_RETENTION_DAYS`

## Database migrations in production

Preferred command:

```bash
npm run prisma:migrate:deploy
```

If you deploy with the provided Docker image, the entrypoint already runs `prisma migrate deploy` automatically at container startup.

Avoid running `prisma migrate dev` in production environments.

## Non-container deployment

If you deploy directly on a VM or PaaS without Docker, the minimal flow is:

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
npm start
```

`npm start` triggers the current `prestart` script, which also executes Prisma migration deploy and client generation before booting the server.

If migrations are executed by your platform separately, make sure duplicate migration execution is acceptable in your deployment model.

## Health and smoke checks

After deployment, verify:

- `GET /api/v1/health`
- Swagger UI at `/api/v1/docs`
- login and refresh flow
- one protected route with `Authorization` header
- one persona-protected route with `X-Persona`
- one moderation endpoint with a moderator/admin token (if moderation is enabled)

## CI status

The repository includes `.github/workflows/test-coverage.yml`.

For pull requests targeting `main`, CI currently runs:

- `npm ci`
- `npm run lint`
- `npm run test:coverage`
- coverage threshold enforcement
- coverage artifact upload
- PR coverage comment generation

This is not a deployment pipeline, but it does protect code quality before merge.

## Deployment notes

- the API depends on PostgreSQL and does not bundle a managed database setup
- the runtime is stateless apart from database and media integrations
- refresh tokens are persisted in the database
- maintenance jobs (verification tokens, email outbox, unverified users) run at startup and on configured cron schedules
- if outbound email is disabled, SMTP variables are still required by the current env loader

## Rollback Strategy (Baseline)

Current repository-level rollback guidance:

- roll forward when possible (apply corrective migration or hotfix)
- keep database backups/snapshots before production deploys
- if image rollout fails, redeploy previously known-good image tag
