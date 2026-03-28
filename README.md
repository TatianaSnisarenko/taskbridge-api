# TeamUp Backend

REST API for a collaboration platform where companies publish project-based tasks and developers apply or receive invites to collaborate through a structured workflow.

## Overview

This repository contains the backend for a diploma project focused on production-style API design and workflow modeling.

The system supports two personas:

- developers, who build profiles, browse tasks/projects, apply, chat, complete work, and leave reviews
- companies, who create projects/tasks, review candidates, send invites, confirm completion, and receive feedback

The platform also includes moderation-oriented flows: task/project reports, task disputes, platform review approval, and admin-managed moderator roles.

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

- signup/login with email and password
- email verification and resend flow
- forgot/reset password flow and authenticated password change
- JWT access token auth with refresh tokens in HTTP-only cookies
- refresh token persistence and revocation tracking

### Personas, roles, and profiles

- persona-aware access using `X-Persona` (`developer` / `company`)
- separate developer and company profile models
- avatar/logo upload endpoints (Multer + Cloudinary path)
- platform roles on user account: `USER`, `MODERATOR`, `ADMIN`
- admin endpoint to grant/revoke moderator role

### Projects and tasks lifecycle

- company-owned projects with status/visibility and technology tags
- task draft creation, update, publish, close, and soft delete
- public catalogs plus owner-oriented views (`owner=true` flows)
- project reports and task reports with moderator/admin resolution
- project-level and task-level review endpoints

### Hiring and collaboration workflow

- developer applications to published tasks
- company-side candidate and recommended developer endpoints
- task invites with accept/decline/cancel actions
- task-linked chat threads with unread tracking
- personal notifications and read/read-all actions
- developer favorites for tasks

### Completion and dispute handling

- developer completion request flow
- company confirm/reject completion actions
- escalation/dispute flow for unresolved completion
- admin/moderator dispute resolution actions

## Tech Stack

| Area            | Technologies                                     |
| --------------- | ------------------------------------------------ |
| Backend         | Node.js 20, Express 4                            |
| Database        | PostgreSQL 16, Prisma 7                          |
| Auth & Security | JWT, bcryptjs, cookie-parser                     |
| Validation      | Joi                                              |
| File & Media    | Multer, Sharp, Cloudinary                        |
| Email           | Nodemailer                                       |
| Background Jobs | node-cron                                        |
| API Docs        | Swagger UI, OpenAPI 3                            |
| Testing         | Jest, Supertest, Testcontainers                  |
| Code Quality    | ESLint 9, Prettier 3, Husky, custom ESLint rules |
| Infrastructure  | Docker, Docker Compose                           |

## Architecture

The codebase uses a layered Express structure:

- `routes/` defines endpoint maps and middleware chains
- `controllers/` handles HTTP input/output boundaries
- `services/` contains feature/domain business logic
- `db/` provides Prisma client access and query helpers
- `middleware/` centralizes auth, persona checks, validation, and errors

Design choices visible in the implementation:

- Prisma schema models explicit workflow states with enums
- task/project soft deletion instead of immediate hard delete
- scheduled verification token cleanup job (`node-cron`)
- modular Swagger composition under `src/docs/swagger`
- route-level Joi validation before controller execution

TODO: add architecture diagram to docs.

## Project Structure

```text
src/
  app.js                 Express app setup
  server.js              startup/shutdown + cron bootstrap
  config/                environment and CORS config
  routes/                API route modules
  controllers/           request handlers
  services/              business logic by domain
  schemas/               Joi request schemas
  middleware/            auth, persona, validation, error handling
  db/                    Prisma client and query helpers
  docs/swagger/          OpenAPI paths/schemas composition
  jobs/                  scheduled tasks
  templates/             email templates
  utils/                 shared helpers
prisma/
  schema.prisma          data model and enums
  migrations/            migration history
  seed.js                seed script
  clean.js               DB cleanup script
tests/
  unit/                  unit tests
  integration/           integration tests
docs/                    project documentation
docker/                  container entrypoint
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 9+
- Docker and Docker Compose
- PostgreSQL 16 (only if not using Docker for DB)

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

PowerShell alternative:

```powershell
Copy-Item .env.example .env
```

### Environment Variables

Create `.env` from `.env.example` and configure values for your environment.

```dotenv
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://teamup:teamup@localhost:5432/teamup?schema=public
JWT_ACCESS_SECRET=change_me_access_secret
ACCESS_TOKEN_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=30
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000
APP_BASE_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173
EMAIL_ADDRESS=example@domain.com
EMAIL_PASSWORD=change_me_email_password
EMAIL_HOST=smtp.example.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_NOTIFICATIONS_ENABLED=false
```

Additional runtime settings used by `src/config/env.js`:

- `COOKIE_SECURE`, `COOKIE_SAMESITE`
- `EMAIL_VERIFICATION_TTL_HOURS`, `VERIFICATION_TOKEN_RETENTION_DAYS`, `PASSWORD_RESET_TOKEN_TTL_MINUTES`
- `UNVERIFIED_USER_DELETION_AFTER_DAYS`, `UNVERIFIED_USER_CLEANUP_CRON`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PLATFORM_REVIEW_COOLDOWN_DAYS`, `TASK_COMPLETION_RESPONSE_HOURS`
- optional seed bootstrap: `ADMIN_EMAIL`, `ADMIN_PASSWORD`

## Running the Project

Run locally:

```bash
npm run dev
```

Default local URLs:

- API: http://localhost:3000/api/v1
- Swagger UI: http://localhost:3000/api/v1/docs
- Health check: http://localhost:3000/api/v1/health

## Running with Docker

Start only database service (recommended for development):

```bash
docker compose up -d db
```

Start both API and DB services:

```bash
docker compose up -d
docker compose exec api npm run prisma:migrate:dev
```

Notes:

- `docker-compose.yml` API service runs `npm install`, `prisma:generate`, and `npm run dev`
- it does not automatically execute development migrations
- production image startup runs `prisma migrate deploy` via `docker/entrypoint.sh`

## Database

Schema and migration source:

- `prisma/schema.prisma`
- `prisma/migrations/`

Main schema domains include:

- users, tokens, onboarding states, roles
- developer/company profiles
- projects, tasks, applications, invites, favorites
- reviews, notifications, chat threads/messages/reads
- task/project reports and task disputes
- technologies and suggestions
- platform reviews

Useful commands:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:migrate:status
npm run prisma:migrate:deploy
npm run prisma:studio
npm run db:clean
npm run db:seed
```

`package.json` includes `db:seed:clean`, but `prisma/seed-clean.js` is currently not present.

## API Overview

Base path: `/api/v1`

Route groups:

- `/auth` - signup/login, verification, password reset, refresh/logout
- `/me` - current user, onboarding, personal catalogs, notifications, chat, favorites
- `/profiles` - developer/company profile CRUD and media upload
- `/projects` - project catalog/management, reports, project reviews, project tasks
- `/tasks` - task catalog/lifecycle, applications, candidates, invites, reviews, reports, disputes
- `/applications` - company accept/reject application actions
- `/invites` - developer accept/decline and company cancel invite actions
- `/users` - user reviews and admin moderator role toggle
- `/technologies` - technology search and type list
- `/platform-reviews` - public and moderated platform reviews

Access model:

- authenticated endpoints require `Authorization: Bearer <access_token>`
- persona-scoped endpoints require `X-Persona: developer` or `X-Persona: company`
- moderator/admin checks rely on persisted user roles, not persona header

Example requests:

```bash
curl http://localhost:3000/api/v1/health
```

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

```bash
curl "http://localhost:3000/api/v1/tasks?limit=10&page=1"
```

See [docs/API.md](docs/API.md) for detailed endpoint documentation.

TODO: add expanded end-to-end workflow examples (company + developer scenario).

## Scripts

| Script                          | Purpose                                                |
| ------------------------------- | ------------------------------------------------------ |
| `npm run dev`                   | start development server via nodemon                   |
| `npm start`                     | production start (runs `prestart` first)               |
| `npm test`                      | run complete test suite                                |
| `npm run test:unit`             | run unit tests                                         |
| `npm run test:integration`      | run integration tests                                  |
| `npm run test:coverage`         | run tests with coverage                                |
| `npm run test:cleanup`          | cleanup test containers                                |
| `npm run lint`                  | JS lint + docs English check + Swagger/Joi consistency |
| `npm run format`                | run Prettier                                           |
| `npm run prisma:generate`       | generate Prisma client                                 |
| `npm run prisma:migrate:dev`    | create/apply development migration                     |
| `npm run prisma:migrate:status` | check migration status                                 |
| `npm run prisma:migrate:deploy` | apply migrations (non-dev)                             |
| `npm run prisma:studio`         | open Prisma Studio                                     |
| `npm run db:clean`              | clean database data                                    |
| `npm run db:seed`               | seed local data                                        |

## Testing

The project includes unit and integration tests with shared Jest base configuration.

- unit tests: `tests/unit`
- integration tests: `tests/integration`
- integration flows use Testcontainers with PostgreSQL

Coverage thresholds enforced in Jest and CI:

- statements: 90%
- branches: 80%
- functions: 95%
- lines: 90%

## Code Quality

- ESLint 9 with custom repository rules
- custom `english-only` lint rule for source/tests
- Prettier 3 formatting
- Swagger/Joi consistency validation script
- Husky + lint-staged configured for local workflow

## CI/CD

GitHub Actions workflow: `.github/workflows/test-coverage.yml`.

On pull requests targeting `main`, the pipeline:

- installs dependencies with npm cache
- runs lint and consistency checks (`npm run lint`)
- runs full coverage test suite (`npm run test:coverage`)
- enforces coverage thresholds
- uploads coverage artifacts
- posts a coverage summary comment on the PR

## Roadmap

- strengthen API examples in `docs/API.md` with persona-based scenarios
- add visual architecture/workflow diagrams
- reconcile/remove `db:seed:clean` script reference if not needed
- expand deployment examples for multi-environment setups
- TODO: add short API demo (GIF/video) for portfolio presentation

## Contributing

See [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) and [docs/PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md).

## Author

Developed and maintained as a diploma backend project with focus on maintainable architecture, strict validation boundaries, and workflow-driven API design.
