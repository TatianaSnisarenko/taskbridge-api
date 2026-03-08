# Development Guide

[← Back to README](../README.md)

This guide covers everything you need to set up and develop the TeamUp IT Backend locally.

## Related Docs

- [Swagger Structure](SWAGGER_STRUCTURE.md) - OpenAPI modular layout and extension rules

## Prerequisites

### Required

- **Node.js** 20 or higher ([Download](https://nodejs.org/))
- **npm** 9+ (comes with Node.js)
- **Docker** and **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop/))

### Optional

- **PostgreSQL 16** (if not using Docker)
- **Prisma Studio** (included, for database GUI)
- **Git** (for version control)

### Verify Installation

```bash
node --version  # Should be v20.x.x or higher
npm --version   # Should be 9.x.x or higher
docker --version
docker compose version
```

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd diploma-project-backend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all production and development dependencies, including:

- Express, Prisma, Joi (production)
- ESLint, Prettier, Jest, Husky (development)

### 3. Set Up Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and configure for local development:

```bash
# Server
PORT=3000
NODE_ENV=development

# Database (Docker defaults)
DATABASE_URL="postgresql://teamup:teamup@localhost:5432/teamup?schema=public"

# JWT (generate a strong random secret)
JWT_ACCESS_SECRET="dev-secret-change-in-production"
ACCESS_TOKEN_TTL_SECONDS=900

# Refresh Token
REFRESH_TOKEN_TTL_DAYS=30
COOKIE_SECURE=false      # Set to true only with HTTPS
COOKIE_SAMESITE=lax

# CORS (your frontend URL)
CLIENT_ORIGIN=http://localhost:5173,http://localhost:3000

# Email (optional for local dev - can use mailtrap.io)
EMAIL_ADDRESS=dev@example.com
EMAIL_PASSWORD=password
EMAIL_HOST=smtp.mailtrap.io
EMAIL_PORT=2525
EMAIL_SECURE=false
EMAIL_NOTIFICATIONS_ENABLED=false

# Application URLs
APP_BASE_URL=http://localhost:3000
FRONTEND_BASE_URL=http://localhost:5173

# Email Verification
EMAIL_VERIFICATION_TTL_HOURS=24
VERIFICATION_TOKEN_RETENTION_DAYS=7

# Password Reset
PASSWORD_RESET_TOKEN_TTL_MINUTES=30

# Cloudinary (optional - for avatar/logo uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_secret
```

### 4. Start PostgreSQL Database

Using Docker (recommended):

```bash
docker compose up -d db
```

This starts PostgreSQL in a container with:

- Database name: `teamup`
- Username: `teamup`
- Password: `teamup`
- Port: `5432`

**Verify it's running:**

```bash
docker ps
```

You should see `teamup-postgres` container running.

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

This generates the Prisma Client based on your schema.

### 6. Run Database Migrations

```bash
npm run prisma:migrate:dev
```

This applies all pending migrations to create the database schema.

On first run, you'll see migrations being applied for:

- Initial tables (users, profiles, projects, tasks)
- Verification tokens
- Chat system
- Technology catalog
- Task invites

### 7. Seed the Database (Optional)

Populate the database with demo data:

```bash
npm run db:seed
```

This creates:

- Sample users (developers and companies)
- Sample projects and tasks
- Technology catalog
- Sample applications and reviews

**Credentials for demo users:**

```
Developer: developer@example.com / password123
Company: company@example.com / password123
```

### 8. Start the Development Server

```bash
npm run dev
```

The server starts at `http://localhost:3000` with auto-reload (nodemon).

**Available endpoints:**

- Health check: `GET http://localhost:3000/api/v1/health`
- Swagger docs: `http://localhost:3000/api/v1/docs`

---

## Environment Variables Reference

### Server Configuration

| Variable   | Description      | Default       | Required |
| ---------- | ---------------- | ------------- | -------- |
| `PORT`     | Server port      | `3000`        | No       |
| `NODE_ENV` | Environment mode | `development` | Yes      |

### Database

| Variable       | Description                  | Required |
| -------------- | ---------------------------- | -------- |
| `DATABASE_URL` | PostgreSQL connection string | Yes      |

Format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`

### JWT & Authentication

| Variable                   | Description                      | Default        | Required |
| -------------------------- | -------------------------------- | -------------- | -------- |
| `JWT_ACCESS_SECRET`        | Secret for signing access tokens | -              | Yes      |
| `ACCESS_TOKEN_TTL_SECONDS` | Access token lifetime            | `900` (15 min) | No       |
| `REFRESH_TOKEN_TTL_DAYS`   | Refresh token lifetime           | `30`           | No       |
| `COOKIE_SECURE`            | Require HTTPS for cookies        | `false`        | No       |
| `COOKIE_SAMESITE`          | Cookie SameSite policy           | `lax`          | No       |

### CORS

| Variable        | Description                     | Required |
| --------------- | ------------------------------- | -------- |
| `CLIENT_ORIGIN` | Comma-separated allowed origins | Yes      |

Example: `http://localhost:5173,https://app.example.com`

### Email (SMTP)

| Variable                      | Description          | Required           |
| ----------------------------- | -------------------- | ------------------ |
| `EMAIL_ADDRESS`               | SMTP sender email    | For email features |
| `EMAIL_PASSWORD`              | SMTP password        | For email features |
| `EMAIL_HOST`                  | SMTP server host     | For email features |
| `EMAIL_PORT`                  | SMTP server port     | For email features |
| `EMAIL_SECURE`                | Use TLS/SSL          | For email features |
| `EMAIL_NOTIFICATIONS_ENABLED` | Enable email sending | No                 |

**For local development**, use [Mailtrap](https://mailtrap.io/) or similar service.

### Application URLs

| Variable                            | Description                  | Required |
| ----------------------------------- | ---------------------------- | -------- |
| `APP_BASE_URL`                      | Backend base URL             | Yes      |
| `FRONTEND_BASE_URL`                 | Frontend base URL            | Yes      |
| `EMAIL_VERIFICATION_TTL_HOURS`      | Email verification token TTL | No       |
| `VERIFICATION_TOKEN_RETENTION_DAYS` | Keep used tokens for         | No       |
| `PASSWORD_RESET_TOKEN_TTL_MINUTES`  | Password reset token TTL     | No       |

### Cloudinary (Optional)

| Variable                | Description           | Required          |
| ----------------------- | --------------------- | ----------------- |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | For image uploads |
| `CLOUDINARY_API_KEY`    | Cloudinary API key    | For image uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | For image uploads |

---

## Database Management

### Prisma Studio

Open a visual database editor:

```bash
npm run prisma:studio
```

Access at `http://localhost:5555`

**Features:**

- Browse all tables
- Edit records directly
- View relationships
- Execute queries

### Creating Migrations

When you modify `prisma/schema.prisma`:

```bash
npm run prisma:migrate:dev -- --name <migration_name>
```

Example:

```bash
npm run prisma:migrate:dev -- --name add_user_preferences
```

This will:

1. Generate SQL migration files
2. Apply migration to database
3. Regenerate Prisma Client

### Migration Status

Check if all migrations are applied:

```bash
npm run prisma:migrate:status
```

### Reset Database

**Warning: This deletes all data!**

```bash
npx prisma migrate reset
```

This will:

1. Drop the database
2. Recreate it
3. Apply all migrations
4. Run seed script (if configured)

### Manual Database Operations

#### Clean all data (keep schema):

```bash
npm run db:clean
```

#### Re-seed:

```bash
npm run db:seed:clean
```

This combines clean + seed.

### Connecting with External Tools

Use these credentials with DBeaver, pgAdmin, or TablePlus:

- **Host:** `localhost`
- **Port:** `5432`
- **Database:** `teamup`
- **Username:** `teamup`
- **Password:** `teamup`

---

## Running the Project

### Development Mode

Auto-reload on file changes:

```bash
npm run dev
```

Uses nodemon to watch for changes in `src/`.

### Production Mode

```bash
npm start
```

Runs migrations and starts the server without auto-reload.

### Using Docker Compose

Start everything (database + API):

```bash
docker compose up -d
```

This will:

- Start PostgreSQL container
- Start API container
- Auto-install dependencies
- Run migrations
- Start server on port 3000

**View logs:**

```bash
docker compose logs -f api
```

**Stop services:**

```bash
docker compose down
```

---

## Testing

### Run All Tests

```bash
npm test
```

Runs both unit and integration tests sequentially.

### Run Unit Tests Only

```bash
npm run test:unit
```

Unit tests:

- Test services in isolation
- Mock database calls
- Fast execution (<10 seconds)

### Run Integration Tests Only

```bash
npm run test:integration
```

Integration tests:

- Test full API endpoints
- Use Testcontainers (real PostgreSQL)
- Slower execution (~30-60 seconds)

### Run Tests with Coverage

```bash
npm run test:coverage
```

Coverage report generated in `coverage/`:

- Open `coverage/lcov-report/index.html` for detailed view

**Coverage thresholds (enforced in CI):**

- Statements: 90%
- Branches: 80%
- Functions: 95%
- Lines: 90%

### Watch Mode

Not configured by default, but you can add:

```bash
npm run test:unit -- --watch
```

### Debugging Tests

Add `console.log()` or use:

```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

Then attach your debugger (VS Code, Chrome DevTools).

### Clean Up Test Containers

If tests leave orphaned Docker containers:

```bash
npm run test:cleanup
```

---

## Code Quality

### Linting

Check code for errors:

```bash
npm run lint
```

**Auto-fix issues:**

```bash
npx eslint . --fix
```

**ESLint rules:**

- ES2023 syntax
- ES Modules (`.js` extension required in imports)
- No console warnings (allowed in this project)
- Import order enforcement

### Formatting

Format all files:

```bash
npm run format
```

Uses Prettier to format:

- JavaScript (`.js`)
- JSON (`.json`)
- Markdown (`.md`)
- YAML (`.yml`, `.yaml`)

**Check formatting without fixing:**

```bash
npx prettier --check .
```

### Pre-commit Hooks

Husky + lint-staged automatically format staged files on commit.

**Setup (already done during `npm install`):**

```bash
npm run prepare
```

**What happens on commit:**

1. Husky triggers pre-commit hook
2. Lint-staged runs Prettier on staged files
3. Formatted files are re-staged
4. Commit proceeds

**Bypass hooks (not recommended):**

```bash
git commit --no-verify
```

---

## Development Workflow

### Typical Development Flow

1. **Create a feature branch:**

   ```bash
   git checkout -b feature/add-user-preferences
   ```

2. **Make changes:**
   - Edit code in `src/`
   - Update Prisma schema if needed
   - Add tests in `tests/`

3. **If schema changed:**

   ```bash
   npm run prisma:migrate:dev -- --name add_user_preferences
   ```

4. **Run tests:**

   ```bash
   npm run lint
   npm run test:coverage
   ```

5. **Commit changes:**

   ```bash
   git add .
   git commit -m "feat: add user preferences feature"
   ```

   Pre-commit hook auto-formats files.

6. **Push and create PR:**
   ```bash
   git push origin feature/add-user-preferences
   ```

### Adding a New Endpoint

1. **Define Joi schema** (`src/schemas/`)
2. **Create service method** (`src/services/<domain>/`)
   - For large domains, services are organized as folders (e.g., `tasks/`, `projects/`)
   - Each folder has an `index.js` that re-exports all modules
   - Keep individual modules under 400 lines (ESLint enforced)
   - Consider using query helpers from `src/db/queries/` for common patterns
3. **Create controller** (`src/controllers/`)
4. **Add route** (`src/routes/`)
5. **Write tests**:
   - Unit test for service (`tests/unit/`)
   - Unit test for controller (`tests/unit/`)
   - Integration test for endpoint (`tests/integration/`)
6. **Update Swagger docs** (if needed)

**Example service structure:**

```
src/services/
  myDomain/
    index.js           # Re-exports all modules
    crud.js            # Create, read, update, delete operations
    workflows.js       # Complex state transitions
    helpers.js         # Shared utilities
```

**Using query helpers:**

```javascript
// Instead of duplicating Prisma queries:
import { findTaskForOwnership } from '../db/queries/tasks.queries.js';

// Use in your service:
const task = await findTaskForOwnership(taskId, userId);
```

### Database Schema Changes

1. **Edit** `prisma/schema.prisma`
2. **Create migration:**
   ```bash
   npm run prisma:migrate:dev -- --name descriptive_name
   ```
3. **Update seed script** if needed (`prisma/seed.js`)
4. **Test migration** on clean database:
   ```bash
   npx prisma migrate reset
   ```

---

## Troubleshooting

### Port Already in Use

If port 3000 is occupied:

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill it (Windows)
taskkill /PID <PID> /F

# Or change PORT in .env
PORT=3001
```

### Database Connection Failed

1. **Check if PostgreSQL is running:**

   ```bash
   docker ps
   ```

2. **Restart database:**

   ```bash
   docker compose restart db
   ```

3. **Check `DATABASE_URL` in `.env`**

4. **Reset database:**
   ```bash
   docker compose down -v
   docker compose up -d db
   npm run prisma:migrate:dev
   ```

### Prisma Client Out of Sync

If you see "Prisma Client is not up to date":

```bash
npm run prisma:generate
```

### Tests Failing

1. **Clean up test containers:**

   ```bash
   npm run test:cleanup
   ```

2. **Ensure Docker is running**

3. **Check for port conflicts** (Testcontainers uses random ports)

4. **Run tests individually:**
   ```bash
   npm test -- tests/unit/auth.service.test.js
   ```

### Pre-commit Hook Not Running

```bash
# Reinstall Husky
npm run prepare

# Check .git/hooks/pre-commit exists
ls .git/hooks/
```

---

## Useful Commands Reference

### Development

| Command                    | Description                       |
| -------------------------- | --------------------------------- |
| `npm run dev`              | Start dev server with auto-reload |
| `npm start`                | Start production server           |
| `npm test`                 | Run all tests                     |
| `npm run test:unit`        | Run unit tests                    |
| `npm run test:integration` | Run integration tests             |
| `npm run test:coverage`    | Run tests with coverage           |
| `npm run lint`             | Lint code                         |
| `npm run format`           | Format code                       |

### Database

| Command                         | Description                |
| ------------------------------- | -------------------------- |
| `npm run prisma:generate`       | Generate Prisma Client     |
| `npm run prisma:migrate:dev`    | Create and apply migration |
| `npm run prisma:migrate:status` | Check migration status     |
| `npm run prisma:studio`         | Open Prisma Studio         |
| `npm run db:seed`               | Seed database              |
| `npm run db:clean`              | Clean all data             |
| `npm run db:seed:clean`         | Clean and re-seed          |

### Docker

| Command                      | Description             |
| ---------------------------- | ----------------------- |
| `docker compose up -d db`    | Start PostgreSQL only   |
| `docker compose up -d`       | Start all services      |
| `docker compose down`        | Stop all services       |
| `docker compose logs -f api` | View API logs           |
| `docker ps`                  | List running containers |

---

## Next Steps

- Read [Architecture Documentation](ARCHITECTURE.md)
- Explore [API Documentation](API.md)
- Check [Deployment Guide](DEPLOYMENT.md)
- Review [Contributing Guidelines](CONTRIBUTING.md)

---

[← Back to README](../README.md)
