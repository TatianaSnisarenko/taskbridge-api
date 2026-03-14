# API Reference

[Back to README](../README.md)

This document describes the currently implemented REST API under `/api/v1`.

## Base URLs

```text
API:     http://localhost:3000/api/v1
Swagger: http://localhost:3000/api/v1/docs
Health:  http://localhost:3000/api/v1/health
```

## Authentication and Access Model

Protected routes require bearer auth:

```http
Authorization: Bearer <access_token>
```

Persona-scoped routes also require:

```http
X-Persona: developer
```

or

```http
X-Persona: company
```

### Roles vs personas

The project uses two independent access concepts:

- personas (`developer`, `company`) chosen per request via header
- platform roles (`USER`, `MODERATOR`, `ADMIN`) persisted in `User.roles`

Moderation and admin endpoints depend on roles, not persona header.

## Naming Conventions

Contracts are intentionally mixed in this codebase:

- auth/signup payload uses camelCase profile blocks
- many profile/project/task write contracts use snake_case fields

Always treat Swagger (`/api/v1/docs`) and Joi schemas (`src/schemas`) as source of truth.

## Endpoint Groups

### Health

| Method | Endpoint  | Access |
| ------ | --------- | ------ |
| GET    | `/health` | public |

### Auth

| Method | Endpoint                    | Notes                                             |
| ------ | --------------------------- | ------------------------------------------------- |
| POST   | `/auth/signup`              | create account, optional embedded persona profile |
| POST   | `/auth/login`               | returns access token and sets refresh cookie      |
| GET    | `/auth/verify-email`        | `token` query param                               |
| POST   | `/auth/resend-verification` | resend verification link                          |
| POST   | `/auth/forgot-password`     | request reset token                               |
| POST   | `/auth/reset-password`      | reset with token                                  |
| POST   | `/auth/refresh`             | rotate refresh token                              |
| POST   | `/auth/logout`              | revoke current refresh token                      |
| POST   | `/auth/password`            | authenticated password change                     |

### Profiles

| Method | Endpoint                      | Access            |
| ------ | ----------------------------- | ----------------- |
| GET    | `/profiles/developers`        | public            |
| POST   | `/profiles/developer`         | authenticated     |
| PUT    | `/profiles/developer`         | authenticated     |
| GET    | `/profiles/developer/:userId` | public            |
| POST   | `/profiles/company`           | authenticated     |
| PUT    | `/profiles/company`           | authenticated     |
| GET    | `/profiles/company/:userId`   | public            |
| POST   | `/profiles/developer/avatar`  | developer persona |
| DELETE | `/profiles/developer/avatar`  | developer persona |
| POST   | `/profiles/company/logo`      | company persona   |
| DELETE | `/profiles/company/logo`      | company persona   |

### Projects

| Method | Endpoint                              | Access                      |
| ------ | ------------------------------------- | --------------------------- |
| GET    | `/projects`                           | public catalog + owner mode |
| GET    | `/projects/:projectId`                | public or conditional auth  |
| GET    | `/projects/:projectId/tasks`          | public or owner-aware       |
| POST   | `/projects`                           | company persona             |
| PUT    | `/projects/:projectId`                | company persona             |
| DELETE | `/projects/:projectId`                | company persona             |
| POST   | `/projects/:projectId/reports`        | authenticated + persona     |
| GET    | `/projects/reports`                   | admin or moderator          |
| PATCH  | `/projects/reports/:reportId/resolve` | admin or moderator          |
| GET    | `/projects/:projectId/reviews`        | public                      |

### Tasks

| Method | Endpoint                                | Access                      |
| ------ | --------------------------------------- | --------------------------- |
| GET    | `/tasks`                                | public catalog + owner mode |
| POST   | `/tasks`                                | company persona             |
| GET    | `/tasks/:taskId`                        | public or conditional auth  |
| PUT    | `/tasks/:taskId`                        | company persona             |
| POST   | `/tasks/:taskId/publish`                | company persona             |
| POST   | `/tasks/:taskId/close`                  | company persona             |
| DELETE | `/tasks/:taskId`                        | company persona             |
| POST   | `/tasks/:taskId/applications`           | developer persona           |
| GET    | `/tasks/:taskId/applications`           | company persona             |
| GET    | `/tasks/:taskId/recommended-developers` | company persona             |
| GET    | `/tasks/:taskId/candidates`             | company persona             |
| POST   | `/tasks/:taskId/invites`                | company persona             |
| GET    | `/tasks/:taskId/invites`                | company persona             |
| POST   | `/tasks/:taskId/reports`                | authenticated + persona     |
| GET    | `/tasks/reports`                        | admin or moderator          |
| PATCH  | `/tasks/reports/:reportId/resolve`      | admin or moderator          |
| POST   | `/tasks/:taskId/dispute`                | company persona             |
| GET    | `/tasks/disputes`                       | admin or moderator          |
| POST   | `/tasks/:taskId/dispute/resolve`        | admin or moderator          |
| POST   | `/tasks/:taskId/completion/request`     | developer persona           |
| POST   | `/tasks/:taskId/completion/escalate`    | developer persona           |
| POST   | `/tasks/:taskId/completion/confirm`     | company persona             |
| POST   | `/tasks/:taskId/completion/reject`      | company persona             |
| POST   | `/tasks/:taskId/reviews`                | authenticated participant   |
| GET    | `/tasks/:taskId/reviews`                | public                      |

### Workflows (`/applications`, `/invites`, `/users`)

| Method | Endpoint                              | Access            |
| ------ | ------------------------------------- | ----------------- |
| POST   | `/applications/:applicationId/accept` | company persona   |
| POST   | `/applications/:applicationId/reject` | company persona   |
| POST   | `/invites/:inviteId/accept`           | developer persona |
| POST   | `/invites/:inviteId/decline`          | developer persona |
| POST   | `/invites/:inviteId/cancel`           | company persona   |
| PATCH  | `/users/:userId/moderator`            | admin             |
| GET    | `/users/:userId/reviews`              | public            |

### Current User (`/me`)

| Method | Endpoint                              | Access                       |
| ------ | ------------------------------------- | ---------------------------- |
| GET    | `/me`                                 | authenticated                |
| DELETE | `/me`                                 | authenticated                |
| PATCH  | `/me/onboarding`                      | authenticated                |
| GET    | `/me/onboarding/check`                | authenticated                |
| POST   | `/me/onboarding/reset`                | authenticated                |
| GET    | `/me/applications`                    | developer persona            |
| GET    | `/me/invites`                         | developer persona            |
| GET    | `/me/tasks`                           | developer persona            |
| GET    | `/me/projects`                        | developer persona            |
| GET    | `/me/notifications`                   | developer or company persona |
| POST   | `/me/notifications/read-all`          | developer or company persona |
| POST   | `/me/notifications/:id/read`          | developer or company persona |
| GET    | `/me/chat/threads`                    | developer or company persona |
| GET    | `/me/chat/threads/:threadId`          | developer or company persona |
| GET    | `/me/chat/threads/:threadId/messages` | developer or company persona |
| POST   | `/me/chat/threads/:threadId/messages` | developer or company persona |
| POST   | `/me/chat/threads/:threadId/read`     | developer or company persona |
| GET    | `/me/favorites/tasks`                 | developer persona            |
| POST   | `/me/favorites/tasks/:taskId`         | developer persona            |
| DELETE | `/me/favorites/tasks/:taskId`         | developer persona            |

### Technologies

| Method | Endpoint              | Access |
| ------ | --------------------- | ------ |
| GET    | `/technologies/types` | public |
| GET    | `/technologies`       | public |

### Platform Reviews

| Method | Endpoint                              | Access                   |
| ------ | ------------------------------------- | ------------------------ |
| GET    | `/platform-reviews`                   | public, optional auth    |
| GET    | `/platform-reviews/:reviewId`         | public, optional auth    |
| POST   | `/platform-reviews`                   | authenticated            |
| PATCH  | `/platform-reviews/:reviewId`         | owner or admin/moderator |
| DELETE | `/platform-reviews/:reviewId`         | admin or moderator       |
| PATCH  | `/platform-reviews/:reviewId/approve` | admin or moderator       |

## Common Query Patterns

- `GET /tasks`: pagination, filters, owner-mode options
- `GET /projects`: pagination, search, technology, owner mode
- `GET /platform-reviews`: `status`, `limit`, `offset`, `sort`

Refer to Swagger for exact parameter shape and allowed values.

## Example Requests

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

## Error Format

Errors are normalized by shared middleware. Typical shape:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found"
  }
}
```

## Notes

- Keep this document in sync with route modules in `src/routes`.
- For exact request/response contracts, prefer Swagger and Joi schemas.
