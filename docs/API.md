# API Documentation

[← Back to README](../README.md)

The TeamUp IT API follows REST conventions and uses JSON for request/response bodies.

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication Flow

### 1. Sign Up

**Endpoint:** `POST /auth/signup`

Creates a new user account and sends a verification email.

**Request:**

```json
{
  "email": "developer@example.com",
  "password": "securePassword123"
}
```

**Response:** `201 Created`

```json
{
  "message": "User created successfully. Please verify your email."
}
```

### 2. Verify Email

**Endpoint:** `POST /auth/verify-email`

Activates the user account.

**Request:**

```json
{
  "token": "verification-token-from-email"
}
```

**Response:** `200 OK`

```json
{
  "message": "Email verified successfully"
}
```

### 3. Log In

**Endpoint:** `POST /auth/login`

Authenticates a user and returns an access token. Sets a refresh token in an HTTP-only cookie.

**Request:**

```json
{
  "email": "developer@example.com",
  "password": "securePassword123"
}
```

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "developer@example.com",
    "emailVerified": true
  }
}
```

**Cookie:** `refresh_token` (HTTP-only, secure in production)

### 4. Refresh Token

**Endpoint:** `POST /auth/refresh`

Rotates the refresh token and returns a new access token.

**Request:** No body required (reads cookie automatically)

**Response:** `200 OK`

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 5. Log Out

**Endpoint:** `POST /auth/logout`

Revokes the refresh token and clears the cookie.

**Request:** No body required

**Response:** `200 OK`

```json
{
  "message": "Logged out successfully"
}
```

### 6. Password Reset

**Request Reset:**

```http
POST /auth/forgot-password
Content-Type: application/json

{
  "email": "developer@example.com"
}
```

**Reset Password:**

```http
POST /auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

## Protected Routes

Protected routes require the `Authorization` header:

```http
Authorization: Bearer <access_token>
```

## Persona-Based Routes

Some routes require an additional `X-Persona` header to specify the user's role:

```http
X-Persona: developer
```

or

```http
X-Persona: company
```

---

## Endpoints Reference

### Authentication

| Method | Endpoint                    | Description               | Auth Required |
| ------ | --------------------------- | ------------------------- | ------------- |
| `POST` | `/auth/signup`              | Register new user         | No            |
| `POST` | `/auth/login`               | Authenticate user         | No            |
| `POST` | `/auth/refresh`             | Refresh access token      | Cookie        |
| `POST` | `/auth/logout`              | Revoke session            | Cookie        |
| `GET`  | `/auth/verify-email`        | Verify email address      | No            |
| `POST` | `/auth/resend-verification` | Resend verification email | No            |
| `POST` | `/auth/forgot-password`     | Request password reset    | No            |
| `POST` | `/auth/reset-password`      | Reset password with token | No            |
| `POST` | `/auth/password`            | Set/change password       | Yes           |

### Current User

| Method   | Endpoint | Description           | Auth Required |
| -------- | -------- | --------------------- | ------------- |
| `GET`    | `/me`    | Get current user info | Yes           |
| `PATCH`  | `/me`    | Update user email     | Yes           |
| `DELETE` | `/me`    | Delete account        | Yes           |

### Profiles

| Method  | Endpoint                   | Description              | Auth Required | Persona   |
| ------- | -------------------------- | ------------------------ | ------------- | --------- |
| `GET`   | `/profiles/developers`     | List developers          | No            | -         |
| `GET`   | `/profiles/developers/:id` | Get developer profile    | No            | -         |
| `GET`   | `/profiles/companies/:id`  | Get company profile      | No            | -         |
| `POST`  | `/profiles/developer`      | Create developer profile | Yes           | developer |
| `PATCH` | `/profiles/developer`      | Update developer profile | Yes           | developer |
| `POST`  | `/profiles/company`        | Create company profile   | Yes           | company   |
| `PATCH` | `/profiles/company`        | Update company profile   | Yes           | company   |

### Projects

| Method   | Endpoint               | Description         | Auth Required | Persona |
| -------- | ---------------------- | ------------------- | ------------- | ------- |
| `POST`   | `/projects`            | Create project      | Yes           | company |
| `GET`    | `/projects`            | List projects       | No            | -       |
| `GET`    | `/projects/:id`        | Get project details | No            | -       |
| `PATCH`  | `/projects/:id`        | Update project      | Yes           | company |
| `DELETE` | `/projects/:id`        | Soft delete project | Yes           | company |
| `POST`   | `/projects/:id/report` | Report a project    | Yes           | -       |

### Tasks

| Method   | Endpoint                        | Description               | Auth Required | Persona   |
| -------- | ------------------------------- | ------------------------- | ------------- | --------- |
| `POST`   | `/tasks`                        | Create task               | Yes           | company   |
| `GET`    | `/tasks`                        | List tasks (with filters) | No            | -         |
| `GET`    | `/tasks/:id`                    | Get task details          | No            | -         |
| `PATCH`  | `/tasks/:id`                    | Update task               | Yes           | company   |
| `DELETE` | `/tasks/:id`                    | Soft delete task          | Yes           | company   |
| `POST`   | `/tasks/:id/publish`            | Publish task              | Yes           | company   |
| `POST`   | `/tasks/:id/request-completion` | Request completion        | Yes           | developer |
| `POST`   | `/tasks/:id/complete`           | Mark task complete        | Yes           | company   |
| `POST`   | `/tasks/:id/reject-completion`  | Reject completion         | Yes           | company   |
| `POST`   | `/tasks/:id/close`              | Close task                | Yes           | company   |

**Query Parameters for GET /tasks:**

- `status` – Filter by status (PUBLISHED, IN_PROGRESS, etc.)
- `type` – Filter by type (PAID, UNPAID, VOLUNTEER, EXPERIENCE)
- `difficulty` – Filter by difficulty (JUNIOR, MIDDLE, SENIOR, ANY)
- `category` – Filter by technology category

### Applications

| Method | Endpoint                   | Description        | Auth Required | Persona   |
| ------ | -------------------------- | ------------------ | ------------- | --------- |
| `POST` | `/applications`            | Apply to a task    | Yes           | developer |
| `GET`  | `/applications`            | List applications  | Yes           | -         |
| `POST` | `/applications/:id/accept` | Accept application | Yes           | company   |
| `POST` | `/applications/:id/reject` | Reject application | Yes           | company   |

### Task Invitations

| Method | Endpoint               | Description              | Auth Required | Persona   |
| ------ | ---------------------- | ------------------------ | ------------- | --------- |
| `POST` | `/invites`             | Invite developer to task | Yes           | company   |
| `GET`  | `/invites`             | List invitations         | Yes           | -         |
| `POST` | `/invites/:id/accept`  | Accept invitation        | Yes           | developer |
| `POST` | `/invites/:id/decline` | Decline invitation       | Yes           | developer |
| `POST` | `/invites/:id/cancel`  | Cancel invitation        | Yes           | company   |

### Technologies

| Method | Endpoint              | Description                  | Auth Required |
| ------ | --------------------- | ---------------------------- | ------------- |
| `GET`  | `/technologies`       | List/search all technologies | No            |
| `GET`  | `/technologies/types` | List technology categories   | No            |

### Current User (Me)

| Method | Endpoint                              | Description                    | Auth Required | Persona   |
| ------ | ------------------------------------- | ------------------------------ | ------------- | --------- |
| `GET`  | `/me`                                 | Get current user info          | Yes           | -         |
| `GET`  | `/me/applications`                    | Get my applications            | Yes           | developer |
| `GET`  | `/me/invites`                         | Get my task invitations        | Yes           | developer |
| `GET`  | `/me/tasks`                           | Get my tasks (as developer)    | Yes           | developer |
| `GET`  | `/me/projects`                        | Get my projects (as developer) | Yes           | developer |
| `GET`  | `/me/notifications`                   | Get my notifications           | Yes           | both      |
| `POST` | `/me/notifications/:id/read`          | Mark notification as read      | Yes           | both      |
| `POST` | `/me/notifications/read-all`          | Mark all notifications as read | Yes           | both      |
| `GET`  | `/me/chat/threads`                    | Get my chat threads            | Yes           | both      |
| `GET`  | `/me/chat/threads/:threadId`          | Get specific chat thread       | Yes           | both      |
| `GET`  | `/me/chat/threads/:threadId/messages` | Get chat messages              | Yes           | both      |
| `POST` | `/me/chat/threads/:threadId/messages` | Send chat message              | Yes           | both      |

### Notifications & Chat

| Method | Endpoint                 | Description      | Auth Required |
| ------ | ------------------------ | ---------------- | ------------- |
| `GET`  | `/users/:userId/reviews` | Get user reviews | No            |

### Reviews

Reviews are bidirectional feedback between developers and companies after task completion.

| Method | Endpoint                 | Description      | Auth Required |
| ------ | ------------------------ | ---------------- | ------------- |
| `POST` | `/users/reviews`         | Create review    | Yes           |
| `GET`  | `/users/:userId/reviews` | Get user reviews | No            |

### Platform Reviews

Platform reviews are user feedback about the platform itself (not about other users).

| Method   | Endpoint                              | Description                 | Auth Required | Admin Only |
| -------- | ------------------------------------- | --------------------------- | ------------- | ---------- |
| `GET`    | `/platform-reviews`                   | List platform reviews       | Optional      | No         |
| `GET`    | `/platform-reviews/:reviewId`         | Get single platform review  | Optional      | No         |
| `POST`   | `/platform-reviews`                   | Create platform review      | Yes           | No         |
| `PATCH`  | `/platform-reviews/:reviewId`         | Update review (owner/admin) | Yes           | No         |
| `DELETE` | `/platform-reviews/:reviewId`         | Delete review               | Yes           | Yes        |
| `PATCH`  | `/platform-reviews/:reviewId/approve` | Approve review              | Yes           | Yes        |

**Query Parameters for GET /platform-reviews:**

- `status` – Filter by status (approved, unapproved, all) - default: 'approved'
- `limit` – Number of results (default: 20, max: 100)
- `offset` – Pagination offset (default: 0)
- `sort` – Sort order (newest, oldest, highest_rated, lowest_rated) - default: 'newest'

**Notes:**

- Only approved reviews are visible to non-authenticated users
- Users can submit one review per cooldown period (configurable via `PLATFORM_REVIEW_COOLDOWN_DAYS`)
- Owners can update their own unapproved reviews
- Admins can update, approve, and delete any review

---

## Request Examples

### Create Developer Profile

```bash
curl -X POST http://localhost:3000/api/v1/profiles/developer \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Persona: developer" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "John Doe",
    "jobTitle": "Full-Stack Developer",
    "bio": "Experienced developer with 5 years in web development",
    "experienceLevel": "MIDDLE",
    "availability": "PART_TIME",
    "location": "Kyiv, Ukraine",
    "timezone": "Europe/Kyiv",
    "portfolioUrl": "https://johndoe.dev",
    "linkedinUrl": "https://linkedin.com/in/johndoe"
  }'
```

### Create and Publish a Task

**1. Create Task (Draft):**

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Persona: company" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Build REST API for Mobile App",
    "description": "We need a Node.js backend developer to build a REST API...",
    "type": "PAID",
    "difficulty": "MIDDLE",
    "estimatedEffortHours": 40,
    "expectedDuration": "DAYS_8_14",
    "deliverables": "- Fully functional REST API\n- Documentation\n- Unit tests",
    "requirements": "- Node.js experience\n- PostgreSQL knowledge",
    "niceToHave": "- Docker experience",
    "visibility": "PUBLIC"
  }'
```

**2. Publish Task:**

```bash
curl -X POST http://localhost:3000/api/v1/tasks/<task-id>/publish \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Persona: company"
```

### Apply to a Task

```bash
curl -X POST http://localhost:3000/api/v1/applications \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Persona: developer" \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "<task-uuid>",
    "message": "I am interested in this project and have relevant experience.",
    "proposedPlan": "Week 1: API design and schema\nWeek 2: Implementation and testing",
    "availabilityNote": "Available to start immediately, 20 hours/week"
  }'
```

### Search Tasks

```bash
curl -X GET "http://localhost:3000/api/v1/tasks?status=PUBLISHED&type=PAID&difficulty=MIDDLE"
```

### Send Chat Message

```bash
curl -X POST http://localhost:3000/api/v1/users/chat-threads/<thread-id>/messages \
  -H "Authorization: Bearer <access_token>" \
  -H "X-Persona: developer" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello! I have a question about the project requirements."
  }'
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "details": [] // Optional validation details
}
```

### Common HTTP Status Codes

| Code  | Description                             |
| ----- | --------------------------------------- |
| `200` | Success                                 |
| `201` | Created                                 |
| `400` | Bad Request (validation error)          |
| `401` | Unauthorized (missing or invalid token) |
| `403` | Forbidden (insufficient permissions)    |
| `404` | Not Found                               |
| `409` | Conflict (duplicate resource)           |
| `500` | Internal Server Error                   |

### Example Validation Error

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## Interactive Documentation

For interactive API testing, visit the Swagger UI:

```
http://localhost:3000/api/v1/docs
```

---

[← Back to README](../README.md)
