# TeamUp Backend

REST API for a collaboration platform where companies publish projects and tasks, developers apply or receive invites, and both sides complete work through a structured workflow with reviews, chat, notifications, and moderation tools.

## Overview

This repository contains the backend for a diploma project focused on a production-style marketplace for short-term technical collaboration.

The system supports two user personas:

- developers, who create profiles, browse work, apply, chat, complete tasks, save favorites, and leave reviews
- companies, who manage public or unlisted projects, publish tasks, review candidates, invite developers, confirm completion, and receive feedback

In addition to the core workflow, the backend includes moderation-oriented features such as content reports, task disputes, platform review approval, and admin-controlled moderator roles.

## Documentation

- [API Reference](docs/API.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Project Standards](docs/PROJECT_STANDARDS.md)
- [Swagger Structure](docs/SWAGGER_STRUCTURE.md)

## Key Features

### Authentication and account security

- email/password signup and login
- email verification and resend flow
- password reset and authenticated password change
- JWT access tokens plus refresh tokens stored in HTTP-only cookies
- refresh token rotation and persisted token revocation

### Personas, roles, and profiles

- developer and company personas selected via `X-Persona`
- separate developer and company profile models
- avatar and logo upload support through Cloudinary
- platform roles stored on the user record: `USER`, `MODERATOR`, `ADMIN`
- admin endpoint to grant or revoke moderator access

### Projects and tasks

- company-owned projects with visibility, status, deadlines, and technology tags
- task drafts, publishing, updates, closing, and soft deletion
- public catalogs for published tasks and active public projects
- owner views for private, unlisted, archived, and soft-deleted records
- project task listing and project review aggregation

### Hiring and collaboration workflow

- developer applications to published tasks
- company-side candidate ranking and recommended developers
- direct task invites with accept, decline, and cancel actions
- task-linked chat threads and unread tracking
- notifications for applications, invites, completion requests, disputes, reviews, and chat activity
- developer favorites for saving interesting tasks

### Completion, reviews, and moderation

- completion request flow with configurable response deadline
- rejection counter and failure transition after repeated rejections
- dispute opening and moderator/admin resolution
- task and project reporting queues for moderators/admins
- task reviews between company and developer after completion
- public platform reviews with moderation approval flow

## Tech Stack

| Area             | Technologies                                     |
| ---------------- | ------------------------------------------------ |
| Runtime          | Node.js 20, Express 4                            |
| Database         | PostgreSQL 16, Prisma 7                          |
| Auth             | JWT, bcryptjs, cookie-parser                     |
| Validation       | Joi                                              |
| Files            | Multer, Sharp, Cloudinary                        |
| Email            | Nodemailer                                       |
| Background jobs  | node-cron                                        |
| API docs         | Swagger UI, OpenAPI 3                            |
| Testing          | Jest, Supertest, Testcontainers                  |
| Quality          | ESLint 9, Prettier 3, Husky, custom ESLint rules |
| Containerization | Docker, Docker Compose                           |

## Architecture

The application follows a layered Express architecture:

- `routes/` wire endpoints, auth, persona checks, and validation
- `controllers/` translate HTTP requests into service calls
- `services/` contain domain logic grouped by feature
- `db/queries/` centralize reusable Prisma access patterns
- `middleware/` handles auth, persona enforcement, validation, and error formatting

Notable implementation choices visible in the codebase:

- modular service folders for larger domains such as tasks, projects, profiles, auth, and me
- Prisma schema with enums for workflow state, moderation state, personas, and platform roles
- soft deletes for tasks and projects
- scheduled cleanup for expired and used verification tokens
- OpenAPI generation from modular Swagger path and schema fragments in `src/docs/swagger`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Project Structure

```text
src/
  app.js                 Express app factory
  server.js              startup, shutdown, and cron bootstrap
  config/                env and CORS configuration
  controllers/           route handlers
  middleware/            auth, persona, validation, error middleware
  routes/                API route modules
  schemas/               Joi request schemas
  services/              domain logic by feature
  db/                    Prisma client and query helpers
  docs/swagger/          modular OpenAPI definitions
  jobs/                  scheduled background jobs
  templates/             email templates
  utils/                 shared helpers
prisma/
  schema.prisma          data model and enums
  migrations/            migration history
  seed.js                seed data script
tests/
  integration/           HTTP and workflow integration tests
  unit/                  unit tests by module
docs/                    repository documentation
docker/                  container entrypoint
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker and Docker Compose
- PostgreSQL 16 if you do not use Docker for the database

### Installation

```bash
git clone <repository-url>
cd diploma-project-backend
npm install
cp .env.example .env
docker compose up -d db
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
npm run dev
```

On Windows PowerShell, replace `cp` with `Copy-Item`.

### Environment variables

The project expects a local `.env` file. The main variables are:

| Variable                         | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `DATABASE_URL`                   | PostgreSQL connection string                     |
| `JWT_ACCESS_SECRET`              | access token signing secret                      |
| `ACCESS_TOKEN_TTL_SECONDS`       | access token lifetime                            |
| `REFRESH_TOKEN_TTL_DAYS`         | refresh token lifetime                           |
| `CLIENT_ORIGIN`                  | allowed frontend origins                         |
| `APP_BASE_URL`                   | backend base URL                                 |
| `FRONTEND_BASE_URL`              | frontend base URL used in emails                 |
| `EMAIL_*`                        | SMTP configuration                               |
| `EMAIL_NOTIFICATIONS_ENABLED`    | enables outbound event email delivery            |
| `CLOUDINARY_*`                   | media upload support                             |
| `PLATFORM_REVIEW_COOLDOWN_DAYS`  | minimum delay between platform reviews           |
| `TASK_COMPLETION_RESPONSE_HOURS` | company response window after completion request |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`  | optional admin user bootstrapping during seed    |

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [.env.example](.env.example) for the full reference.

## Running the Project

### Local development

```bash
npm run dev
```

Available URLs:

- API base: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/v1/docs
- Health check: http://localhost:3000/api/v1/health

### Docker Compose

Start the local database only:

```bash
docker compose up -d db
```

Or start both services:

```bash
docker compose up -d
docker compose exec api npm run prisma:migrate:dev
```

Note: the development Compose service generates Prisma client and starts `npm run dev`, but it does not apply development migrations automatically.

## Database

The database schema lives in [prisma/schema.prisma](prisma/schema.prisma).

Current schema areas include:

- users, refresh tokens, verification tokens, platform roles
- developer and company profiles
- projects, tasks, applications, invites, favorites
- reviews, notifications, chat threads and reads
- project reports, task reports, task disputes
- technology catalog and cross-reference tables
- platform reviews

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:status
npm run prisma:studio
npm run db:clean
npm run db:seed
```

## API Overview

Base path: `/api/v1`

Main route groups:

- `/auth` - signup, login, verify email, reset password, refresh, logout, change password
- `/profiles` - developer and company profiles, media upload endpoints, developer discovery
- `/projects` - project catalog, owner management, reports, project reviews, project task listing
- `/tasks` - task catalog, drafts, lifecycle actions, applications, candidate discovery, invites, reviews, reports, disputes
- `/applications` - accept or reject a submitted application
- `/invites` - accept, decline, or cancel invites
- `/me` - current user data, personal catalogs, notifications, chat, favorites
- `/users` - user reviews and admin moderator management
- `/technologies` - technology catalog and type listing
- `/platform-reviews` - platform feedback and moderation

Important access rules:

- protected routes require `Authorization: Bearer <access_token>`
- persona-scoped routes require `X-Persona: developer` or `X-Persona: company`
- moderator/admin features use persisted roles on the user record, not the persona header

See [docs/API.md](docs/API.md) for the current endpoint map.

## Scripts

| Script                          | Purpose                                              |
| ------------------------------- | ---------------------------------------------------- |
| `npm run dev`                   | start dev server with nodemon                        |
| `npm start`                     | production start                                     |
| `npm test`                      | run all tests                                        |
| `npm run test:unit`             | unit tests only                                      |
| `npm run test:integration`      | integration tests only                               |
| `npm run test:coverage`         | coverage run                                         |
| `npm run lint`                  | JS lint, docs English check, Swagger/Joi consistency |
| `npm run format`                | Prettier formatting                                  |
| `npm run prisma:generate`       | generate Prisma client                               |
| `npm run prisma:migrate:dev`    | create/apply dev migration                           |
| `npm run prisma:migrate:deploy` | apply production migrations                          |
| `npm run prisma:studio`         | open Prisma Studio                                   |
| `npm run db:clean`              | clear data while preserving schema                   |
| `npm run db:seed`               | seed local data                                      |

## Testing and Code Quality

The repository includes both unit and integration coverage.

- integration tests run against PostgreSQL through Testcontainers
- coverage thresholds are enforced in Jest and CI
- ESLint includes a custom `english-only` rule for source and test content
- Swagger and Joi definitions are checked for consistency via `npm run check:swagger-joi`

Current global coverage thresholds:

- statements: 90%
- branches: 80%
- functions: 95%
- lines: 90%

GitHub Actions runs linting, tests, coverage enforcement, artifact upload, and PR coverage comments for pull requests targeting `main`.

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md).

## Author

Maintained as a diploma backend project with emphasis on API design, workflow modeling, validation, testing, and deployment readiness.
