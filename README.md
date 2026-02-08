# TeamUp IT - Backend (initial)

This repo is an initial backend scaffold for TeamUp IT:

- **Express (JS ESM)**
- **PostgreSQL in Docker**
- **Prisma + migrations**
- **Access JWT + Refresh token in httpOnly cookie (rotation)**
- ESLint + Prettier

## Quick start (local)

1. Copy env file:

```bash
cp .env.example .env
```

2. Start Postgres only:

```bash
docker compose up -d db
```

3. Install deps:

```bash
npm i
```

4. Generate Prisma client (first run or after schema changes):

```bash
npm run prisma:generate
```

5. Create migrations (on schema changes):

```bash
npm run prisma:migrate:dev -- --name <migration_name>
```

6. Run migrations (applies the schema in Postgres):

```bash
npm run prisma:migrate:dev -- --name init
```

7. Start API:

```bash
npm run dev
```

Health check:

- `GET http://localhost:3000/api/v1/health`

## Pre-commit formatting

We use Husky + lint-staged to auto-format staged files on `git commit`.

Setup once after install:

```bash
npm run prepare
```

Formatting runs via Prettier only on staged files and re-stages them.

## Docker (local dev)

Start only the database:

```bash
docker compose up -d db
```

Start database + API:

```bash
docker compose up -d db api
```

## DB connection (DBeaver)

Use the same values as in `.env` / `docker-compose.yml`. For the default compose setup:

- Host: `localhost`
- Port: `5432`
- Database: `teamup`
- User: `teamup`
- Password: `teamup`

Or use the JDBC URL equivalent of `DATABASE_URL`.

## Auth flow

- `POST /api/v1/auth/signup`
- `POST /api/v1/auth/login` -> returns `access_token` and sets `refresh_token` cookie
- `POST /api/v1/auth/refresh` -> reads cookie, rotates refresh token, returns new access
- `POST /api/v1/auth/logout` -> revokes refresh and clears cookie

> Frontend requests must use `credentials: "include"` to send cookies.

## CORS

Set allowed origin(s) in `.env`:

- `CLIENT_ORIGIN=http://localhost:5173`
- multiple values: `CLIENT_ORIGIN=http://localhost:5173,https://app.example.com`

Backend uses `credentials: true` and allows headers: `Authorization, X-Persona, Content-Type`.

## Docker (deploy)

Build:

```bash
docker build -t teamup-backend:local .
```

Run:

```bash
docker run --rm -p 3000:3000 --env-file .env teamup-backend:local
```

On container start we run:

- `prisma migrate deploy`

So make sure `DATABASE_URL` points to your production DB.
