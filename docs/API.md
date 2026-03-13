# API Reference

[Back to README](../README.md)

This document reflects the current Express routes under `/api/v1`.

## Base URL

```text
http://localhost:3000/api/v1
```

## Authentication model

Protected routes require:

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

The codebase uses two separate concepts:

- personas: `developer` and `company`, selected per request through `X-Persona`
- platform roles: `USER`, `MODERATOR`, `ADMIN`, stored on `User.roles`

`ADMIN` and `MODERATOR` are used for moderation and review approval endpoints.

## Request naming conventions

Request payloads are not fully uniform across all modules yet.

- auth signup uses camelCase nested profile objects
- most profile, project, and task write endpoints use snake_case fields

Use Swagger at `/api/v1/docs` when in doubt.

## Authentication endpoints

| Method | Endpoint                    | Notes                                          |
| ------ | --------------------------- | ---------------------------------------------- |
| POST   | `/auth/signup`              | create user, optional embedded profile         |
| POST   | `/auth/login`               | returns access token and sets refresh cookie   |
| GET    | `/auth/verify-email`        | expects `token` query param                    |
| POST   | `/auth/resend-verification` | resend email verification                      |
| POST   | `/auth/forgot-password`     | issue password reset token                     |
| POST   | `/auth/reset-password`      | reset password with `token` and `new_password` |
| POST   | `/auth/refresh`             | rotate refresh token                           |
| POST   | `/auth/logout`              | revoke refresh token                           |
| POST   | `/auth/password`            | authenticated password change                  |

### Signup example

```json
{
  "email": "developer@example.com",
  "password": "Password123!",
  "developerProfile": {
    "displayName": "Alex Doe",
    "jobTitle": "Backend Developer",
    "bio": "Node.js developer focused on APIs and testing.",
    "experienceLevel": "MIDDLE",
    "availability": "PART_TIME"
  }
}
```

## Profile endpoints

| Method | Endpoint                      | Access                   |
| ------ | ----------------------------- | ------------------------ |
| GET    | `/profiles/developers`        | public developer catalog |
| POST   | `/profiles/developer`         | authenticated user       |
| PUT    | `/profiles/developer`         | authenticated user       |
| GET    | `/profiles/developer/:userId` | public                   |
| POST   | `/profiles/company`           | authenticated user       |
| PUT    | `/profiles/company`           | authenticated user       |
| GET    | `/profiles/company/:userId`   | public                   |
| POST   | `/profiles/developer/avatar`  | developer persona        |
| DELETE | `/profiles/developer/avatar`  | developer persona        |
| POST   | `/profiles/company/logo`      | company persona          |
| DELETE | `/profiles/company/logo`      | company persona          |

## Project endpoints

| Method | Endpoint                              | Access                                                              |
| ------ | ------------------------------------- | ------------------------------------------------------------------- |
| GET    | `/projects`                           | public catalog, owner mode available                                |
| GET    | `/projects/reports`                   | admin or moderator                                                  |
| PATCH  | `/projects/reports/:reportId/resolve` | admin or moderator                                                  |
| GET    | `/projects/:projectId`                | public for active/public, conditional auth for owner/deleted access |
| GET    | `/projects/:projectId/tasks`          | public task preview or owner view                                   |
| POST   | `/projects`                           | company persona                                                     |
| PUT    | `/projects/:projectId`                | company persona                                                     |
| DELETE | `/projects/:projectId`                | company persona                                                     |
| POST   | `/projects/:projectId/reports`        | authenticated developer or company persona                          |
| GET    | `/projects/:projectId/reviews`        | public aggregated reviews for tasks in project                      |

### Project catalog filters

`GET /projects` supports:

- `page`, `size`
- `search`
- `technology`
- `visibility`
- `owner`
- `include_deleted`

Notes:

- `owner=true` requires authentication and company persona at route level
- `include_deleted=true` is only valid in owner mode
- archived projects are not part of the public catalog

## Task endpoints

| Method | Endpoint                                | Access                                                        |
| ------ | --------------------------------------- | ------------------------------------------------------------- |
| GET    | `/tasks`                                | public catalog, owner mode available                          |
| POST   | `/tasks`                                | company persona                                               |
| GET    | `/tasks/disputes`                       | admin or moderator                                            |
| GET    | `/tasks/reports`                        | admin or moderator                                            |
| PATCH  | `/tasks/reports/:reportId/resolve`      | admin or moderator                                            |
| GET    | `/tasks/:taskId`                        | public for published/public tasks, conditional auth otherwise |
| PUT    | `/tasks/:taskId`                        | company persona                                               |
| POST   | `/tasks/:taskId/publish`                | company persona                                               |
| POST   | `/tasks/:taskId/applications`           | developer persona                                             |
| GET    | `/tasks/:taskId/applications`           | company persona                                               |
| GET    | `/tasks/:taskId/recommended-developers` | company persona                                               |
| GET    | `/tasks/:taskId/candidates`             | company persona                                               |
| POST   | `/tasks/:taskId/invites`                | company persona                                               |
| GET    | `/tasks/:taskId/invites`                | company persona                                               |
| POST   | `/tasks/:taskId/reports`                | authenticated developer or company persona                    |
| POST   | `/tasks/:taskId/dispute`                | company persona                                               |
| POST   | `/tasks/:taskId/dispute/resolve`        | admin or moderator                                            |
| POST   | `/tasks/:taskId/completion/request`     | developer persona                                             |
| POST   | `/tasks/:taskId/completion/escalate`    | developer persona                                             |
| POST   | `/tasks/:taskId/completion/confirm`     | company persona                                               |
| POST   | `/tasks/:taskId/completion/reject`      | company persona                                               |
| POST   | `/tasks/:taskId/reviews`                | authenticated participant                                     |
| GET    | `/tasks/:taskId/reviews`                | public                                                        |
| POST   | `/tasks/:taskId/close`                  | company persona                                               |
| DELETE | `/tasks/:taskId`                        | company persona                                               |

### Task catalog filters

`GET /tasks` supports:

- `page`, `size`
- `search`
- `category`
- `difficulty`
- `type`
- `technology_ids`
- `tech_match=ANY|ALL`
- `project_id`
- `owner`
- `include_deleted`

### Task draft example

```json
{
  "project_id": null,
  "title": "Add filtering to task catalog",
  "description": "Implement search, pagination, and technology filtering.",
  "category": "BACKEND",
  "type": "PAID",
  "difficulty": "MIDDLE",
  "technology_ids": ["<technology-uuid>"],
  "estimated_effort_hours": 12,
  "expected_duration": "DAYS_8_14",
  "communication_language": "EN",
  "timezone_preference": "Europe/Kyiv",
  "application_deadline": "2026-04-01",
  "deadline": "2026-04-15",
  "visibility": "PUBLIC",
  "deliverables": ["code", "tests"],
  "requirements": ["Express", "PostgreSQL"],
  "nice_to_have": ["Swagger"]
}
```

## Application endpoints

| Method | Endpoint                              | Access          |
| ------ | ------------------------------------- | --------------- |
| POST   | `/applications/:applicationId/accept` | company persona |
| POST   | `/applications/:applicationId/reject` | company persona |

Application creation happens on the nested route `POST /tasks/:taskId/applications`.

## Invite endpoints

| Method | Endpoint                     | Access            |
| ------ | ---------------------------- | ----------------- |
| POST   | `/invites/:inviteId/accept`  | developer persona |
| POST   | `/invites/:inviteId/decline` | developer persona |
| POST   | `/invites/:inviteId/cancel`  | company persona   |

Invite creation and listing happen on task-scoped routes:

- `POST /tasks/:taskId/invites`
- `GET /tasks/:taskId/invites`

## Current user endpoints

| Method | Endpoint                              | Access                       |
| ------ | ------------------------------------- | ---------------------------- |
| GET    | `/me`                                 | authenticated                |
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

## User endpoints

| Method | Endpoint                   | Access |
| ------ | -------------------------- | ------ |
| PATCH  | `/users/:userId/moderator` | admin  |
| GET    | `/users/:userId/reviews`   | public |

## Technology endpoints

| Method | Endpoint              | Access |
| ------ | --------------------- | ------ |
| GET    | `/technologies/types` | public |
| GET    | `/technologies`       | public |

## Platform review endpoints

| Method | Endpoint                              | Access                   |
| ------ | ------------------------------------- | ------------------------ |
| GET    | `/platform-reviews`                   | public, optional auth    |
| GET    | `/platform-reviews/:reviewId`         | public, optional auth    |
| POST   | `/platform-reviews`                   | authenticated            |
| PATCH  | `/platform-reviews/:reviewId`         | owner or admin/moderator |
| DELETE | `/platform-reviews/:reviewId`         | admin or moderator       |
| PATCH  | `/platform-reviews/:reviewId/approve` | admin or moderator       |

`GET /platform-reviews` supports:

- `status=approved|pending|all`
- `limit`
- `offset`
- `sort=newest|oldest|highest_rated|lowest_rated`

## Workflow notes

### Task lifecycle

Primary task statuses in the Prisma schema:

- `DRAFT`
- `PUBLISHED`
- `IN_PROGRESS`
- `DISPUTE`
- `COMPLETION_REQUESTED`
- `COMPLETED`
- `FAILED`
- `CLOSED`
- `DELETED`

### Completion flow

Typical happy path:

1. company creates draft task
2. company publishes task
3. developer applies or accepts invite
4. company accepts application
5. task moves to `IN_PROGRESS`
6. developer requests completion
7. company confirms completion
8. both sides may leave task review

Moderation path:

- company may open dispute on in-progress task
- developer may escalate overdue completion confirmation
- admin/moderator resolves dispute with `RETURN_TO_PROGRESS`, `MARK_FAILED`, or `MARK_COMPLETED`

### Reporting flow

- projects and tasks can be reported once per user
- moderators/admins can resolve reports with `DISMISS` or `DELETE`
- delete resolution soft-deletes the underlying task or archives/deletes the project through service logic

## Error format

Errors are returned through shared middleware and include a stable `error.code` value. Example:

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found"
  }
}
```
