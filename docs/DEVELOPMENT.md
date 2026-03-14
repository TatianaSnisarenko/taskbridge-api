# Development Guide

[Back to README](../README.md)

This guide covers local setup, environment variables, database workflows, testing, and day-to-day development conventions visible in the repository.

## Prerequisites

Required:

- Node.js 20+
- npm 9+
- Docker and Docker Compose

Optional:

- local PostgreSQL 16 instead of Docker
- Prisma Studio for database inspection

Recommended:

- Node version manager (`nvm`, `fnm`, `asdf`, or equivalent)

## Initial setup

### 1. Install dependencies

```bash
git clone <repository-url>
cd diploma-project-backend
npm install
```

### 2. Create local environment file

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Start PostgreSQL

Recommended:

```bash
docker compose up -d db
```

This starts PostgreSQL 16 with the defaults already used by `.env.example`:

- database: `teamup`
- username: `teamup`
- password: `teamup`
- port: `5432`

### 4. Generate Prisma client and apply migrations

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

### 5. Seed local data

```bash
npm run db:seed
```

### 6. Start the API

```bash
npm run dev
```

The server starts verification token cleanup at boot and schedules daily cleanup via cron.

Useful local URLs:

- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/v1/docs
- Health: http://localhost:3000/api/v1/health

## Environment variables

Runtime validation is defined in `src/config/env.js`.

### Core application settings

| Variable            | Required | Default                 | Notes                        |
| ------------------- | -------- | ----------------------- | ---------------------------- |
| `NODE_ENV`          | no       | `development`           | environment name             |
| `PORT`              | no       | `3000`                  | HTTP port                    |
| `DATABASE_URL`      | yes      | -                       | PostgreSQL connection string |
| `APP_BASE_URL`      | no       | `http://localhost:3000` | used for Swagger and emails  |
| `FRONTEND_BASE_URL` | no       | `http://localhost:5173` | frontend links in emails     |
| `CLIENT_ORIGIN`     | no       | `http://localhost:5173` | CORS allow list source       |

### Authentication and cookie settings

| Variable                   | Required | Default |
| -------------------------- | -------- | ------- |
| `JWT_ACCESS_SECRET`        | yes      | -       |
| `ACCESS_TOKEN_TTL_SECONDS` | no       | `900`   |
| `REFRESH_TOKEN_TTL_DAYS`   | no       | `30`    |
| `COOKIE_SECURE`            | no       | `false` |
| `COOKIE_SAMESITE`          | no       | `lax`   |

### Email settings

These are required by the current env loader even if outbound notifications are disabled.

| Variable                      | Required |
| ----------------------------- | -------- |
| `EMAIL_ADDRESS`               | yes      |
| `EMAIL_PASSWORD`              | yes      |
| `EMAIL_HOST`                  | yes      |
| `EMAIL_PORT`                  | no       |
| `EMAIL_SECURE`                | no       |
| `EMAIL_NOTIFICATIONS_ENABLED` | no       |

### Media and workflow settings

| Variable                            | Required | Notes                         |
| ----------------------------------- | -------- | ----------------------------- |
| `CLOUDINARY_CLOUD_NAME`             | no       | image upload support          |
| `CLOUDINARY_API_KEY`                | no       | image upload support          |
| `CLOUDINARY_API_SECRET`             | no       | image upload support          |
| `PLATFORM_REVIEW_COOLDOWN_DAYS`     | no       | review cooldown               |
| `TASK_COMPLETION_RESPONSE_HOURS`    | no       | completion confirmation SLA   |
| `EMAIL_VERIFICATION_TTL_HOURS`      | no       | verification token lifetime   |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`  | no       | reset token lifetime          |
| `VERIFICATION_TOKEN_RETENTION_DAYS` | no       | cleanup retention window      |
| `ADMIN_EMAIL`                       | no       | optional seed admin bootstrap |
| `ADMIN_PASSWORD`                    | no       | optional seed admin bootstrap |

## Docker workflows

### Database-only workflow

```bash
docker compose up -d db
```

This is the simplest local setup and is the recommended option for day-to-day development.

### Full development Compose workflow

```bash
docker compose up -d
```

Important note: the `api` service in `docker-compose.yml` runs:

```text
npm install && npm run prisma:generate && npm run dev
```

It does not run `prisma migrate dev` automatically, so after the first start you should apply migrations manually:

```bash
docker compose exec api npm run prisma:migrate:dev
```

To stop services:

```bash
docker compose down
```

## Database workflows

### Generate Prisma client

```bash
npm run prisma:generate
```

### Create and apply a development migration

```bash
npm run prisma:migrate:dev -- --name add_feature_name
```

### Check migration status

```bash
npm run prisma:migrate:status
```

### Open Prisma Studio

```bash
npm run prisma:studio
```

### Clean data without removing schema

```bash
npm run db:clean
```

### Reseed local database

```bash
npm run db:seed
```

The repository currently exposes a `db:seed:clean` script in `package.json`, but the implementation file is not present. Prefer running `db:clean` followed by `db:seed`.

## Seed data notes

`prisma/seed.js` currently does more than insert a minimal fixture set.

It includes:

- a broad seeded technology catalog
- sample companies and developers
- sample projects, tasks, applications, invites, notifications, chat data, and reviews
- optional admin user creation when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are defined

## Running tests

### Full suite

```bash
npm test
```

### Unit tests only

```bash
npm run test:unit
```

### Integration tests only

```bash
npm run test:integration
```

### Coverage run

```bash
npm run test:coverage
```

### Testcontainers cleanup helper

```bash
npm run test:cleanup
```

## Testing strategy

The repository is structured around two goals:

- unit tests should cover most business logic in isolation
- integration tests should validate route wiring, auth, middleware, and cross-layer workflows

Integration tests use Testcontainers and a real PostgreSQL instance.

Current global coverage thresholds in Jest are:

- statements: 90
- branches: 80
- functions: 95
- lines: 90

## Linting and formatting

### Lint

```bash
npm run lint
```

This runs:

- JavaScript linting
- English-only documentation/content checks
- Swagger and Joi consistency validation

### Format

```bash
npm run format
```

## Development conventions reflected in the repo

- ES modules only
- thin controllers and service-oriented business logic
- Joi validation at route boundaries
- Prisma as the only ORM layer
- domain folders for large services
- soft deletes for tasks and projects
- Swagger generated from modular fragments

## Recommended Development Loop

```text
1) Pull latest main
2) Create feature branch
3) Implement change
4) Run lint + targeted tests
5) Run full coverage before PR
6) Update docs if contracts/workflows changed
```

See also:

- [Architecture](ARCHITECTURE.md)
- [Project Standards](PROJECT_STANDARDS.md)
- [Swagger Structure](SWAGGER_STRUCTURE.md)
