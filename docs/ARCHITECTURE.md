# Architecture Documentation

[← Back to README](../README.md)

## System Architecture

TeamUp IT Backend follows a **layered architecture** pattern with strict separation of concerns.

```
┌─────────────────────────────────────────┐
│           HTTP Client Request           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│        Express.js Application           │
├─────────────────────────────────────────┤
│  Routes (routing + middleware wiring)   │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│            Middleware Layer             │
├─────────────────────────────────────────┤
│  • Authentication (JWT validation)      │
│  • Authorization (Persona checking)     │
│  • Request Validation (Joi schemas)     │
│  • Error Handling                       │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          Controllers Layer              │
├─────────────────────────────────────────┤
│  • Extract request data                 │
│  • Call service methods                 │
│  • Map response to HTTP format          │
│  • NO business logic                    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│           Services Layer                │
├─────────────────────────────────────────┤
│  • Business logic                       │
│  • Transaction orchestration            │
│  • Data validation                      │
│  • Authorization checks                 │
│  • Notifications triggering             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│         Data Access Layer               │
├─────────────────────────────────────────┤
│       Prisma Client (ORM)               │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          PostgreSQL Database            │
└─────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Stateless API Design

**Decision:** Use JWT-based authentication instead of session-based authentication.

**Rationale:**

- Enables horizontal scaling without session store
- Simplifies deployment across multiple instances
- Reduces server-side memory usage
- Allows frontend and backend to be deployed independently

**Implementation:**

- Short-lived access tokens (15 minutes)
- Long-lived refresh tokens (30 days) stored in HTTP-only cookies
- Automatic token rotation on refresh for enhanced security

### 2. Service Layer Pattern

**Decision:** Isolate all business logic in a dedicated service layer.

**Rationale:**

- Controllers remain thin and focused on HTTP concerns
- Business logic is testable in isolation
- Logic can be reused across different controllers
- Clear separation makes codebase easier to understand and maintain

**Example:**

```javascript
// Controller (thin)
async createTask(req, res) {
  const task = await tasksService.createTask(req.user.id, req.body);
  res.status(201).json(task);
}

// Service (contains business logic)
async createTask(userId, data) {
  // Validate ownership
  // Check project permissions
  // Create task with transaction
  // Trigger notifications
  return task;
}
```

### 3. Modular Service Architecture

**Decision:** Organize services as domain folders with multiple specialized modules instead of monolithic service files.

**Rationale:**

- Prevents service file bloat (enforced by ESLint max-lines rule: 400 lines)
- Improves code navigation and discoverability
- Enables focused testing of specific functionality
- Reduces merge conflicts when multiple developers work on same domain
- Makes code reviews more manageable

**Structure:**

```
src/services/
  tasks/
    index.js              # Re-exports all task modules
    task-drafts.js        # Draft creation and publishing
    task-catalog.js       # Browse, search, and filter
    candidates.js         # Candidate matching and recommendations
    helpers.js            # Shared utilities
    workflows/
      application.js      # Apply/accept/reject workflow
      completion.js       # Task completion workflow
      review.js           # Review workflow
  projects/
    index.js              # Re-exports all project modules
    lifecycle.js          # Create/update/delete operations
    catalog.js            # Browse and search
    reporting.js          # Report projects
    helpers.js            # Shared utilities
  profiles/
    index.js              # Re-exports all profile modules
    developer.js          # Developer profile management
    company.js            # Company profile management
    reviews.js            # Review system
    helpers.js            # Profile utilities
```

**Benefits achieved:**

- No service module exceeds 400 lines
- Clear separation between CRUD, workflows, and utilities
- Easier to locate specific functionality
- Better code organization for large domains

### 4. Query Helper Abstraction

**Decision:** Extract common Prisma query patterns into reusable helper functions.

**Rationale:**

- Eliminates duplicate query patterns across services (DRY principle)
- Single source of truth for complex queries
- Easier to test services (mock query helpers instead of Prisma)
- Consistent ownership and permission checking
- Simplified service code focuses on business logic

**Structure:**

```
src/db/
  prisma.js       # Prisma client instance
  queries/
    tasks.queries.js     # Task query helpers
    projects.queries.js  # Project query helpers (planned)
    profiles.queries.js  # Profile query helpers (planned)
```

**Implementation pattern:**

```javascript
// src/db/queries/tasks.queries.js
/**
 * Find task and verify ownership.
 * Single source of truth - used by 8+ service methods
 */
export async function findTaskForOwnership(taskId, userId) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, ownerUserId: true, deletedAt: true },
  });

  if (!task || task.deletedAt) {
    throw new ApiError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.ownerUserId !== userId) {
    throw new ApiError(403, 'NOT_OWNER', 'Task does not belong to user');
  }

  return task;
}

/**
 * Find task with configurable relations
 */
export async function findTaskWithDetails(taskId, options = {}) {
  const { includeOwner, includeTechnologies, includeProject } = options;

  return prisma.task.findUnique({
    where: { id: taskId },
    include: {
      owner: includeOwner ? { include: { companyProfile: true } } : false,
      technologies: includeTechnologies ? { include: { technology: true } } : false,
      project: includeProject,
    },
  });
}
```

**Service usage:**

```javascript
// Before: Duplicated everywhere (15+ times)
const task = await prisma.task.findUnique({...});
if (!task || task.deletedAt) throw new ApiError(404, ...);
if (task.ownerUserId !== userId) throw new ApiError(403, ...);

// After: Clean, reusable, consistent
import { findTaskForOwnership } from '../db/queries/tasks.queries.js';
const task = await findTaskForOwnership(taskId, userId);
```

### 5. Schema-First Validation

**Decision:** Use Joi schemas to validate all inputs before processing.

**Rationale:**

- Centralized validation rules
- Consistent error messages
- Prevents invalid data from reaching business logic
- Self-documenting API contracts

**Implementation:**

- Joi schemas defined in `src/schemas/`
- Validation middleware applied at route level
- Clear error messages returned to client

### 6. Refresh Token Rotation

**Decision:** Rotate refresh tokens on every refresh request.

**Rationale:**

- Enhanced security against token theft
- Compromised tokens have limited validity
- Implements OAuth 2.0 best practices

**Implementation:**

- Old token revoked immediately
- New token issued with extended expiry
- Automatic cleanup of expired tokens via cron job

### 7. Soft Deletes

**Decision:** Use `deletedAt` timestamps instead of hard deletes for tasks and projects.

**Rationale:**

- Preserve data integrity and relationships
- Enable data recovery
- Maintain historical records for analytics
- Comply with potential audit requirements

**Implementation:**

```prisma
model Task {
  deletedAt DateTime? @map("deleted_at")
}
```

### 8. Composite Unique Constraints

**Decision:** Enforce uniqueness at database level for critical relationships.

**Rationale:**

- Prevent race conditions
- Data integrity guaranteed by database
- No need for distributed locks
- Atomic operations

**Examples:**

```prisma
@@unique([taskId, developerUserId]) // One application per developer per task
@@unique([ownerUserId, title])      // Unique project titles per owner
```

### 9. Event-Driven Notifications

**Decision:** Centralize notification creation in service layer.

**Rationale:**

- Single source of truth for notification logic
- Consistent notification format
- Easy to add notification channels (email, push, etc.)
- Business logic triggers notifications automatically

### 10. Scheduled Cleanup Jobs

**Decision:** Use node-cron for periodic data cleanup.

**Rationale:**

- Automatic housekeeping (expired tokens, old notifications)
- Reduces database bloat
- No manual intervention required
- Runs in-process (no external scheduler needed)

**Implementation:**

```javascript
cron.schedule('0 2 * * *', () => {
  // Clean up expired verification tokens daily at 2 AM
});
```

---

## Database Schema

### Entity Relationship Overview

```
Users
├── DeveloperProfile (1:1)
│   └── DeveloperTechnologies (1:N)
├── CompanyProfile (1:1)
├── Projects (1:N)
│   ├── Tasks (1:N)
│   └── ProjectTechnologies (1:N)
└── Reviews (author/target)

Tasks
├── Applications (1:N)
│   └── AcceptedApplication (1:1)
├── TaskInvites (1:N)
├── ChatThread (1:1)
│   └── ChatMessages (1:N)
├── TaskTechnologies (1:N)
└── Reviews (1:N)

Technologies
├── DeveloperTechnologies (N:M)
├── TaskTechnologies (N:M)
├── ProjectTechnologies (N:M)
└── TechnologySuggestions (1:N)

Notifications (polymorphic)
├── User (recipient)
├── Actor (user who triggered)
├── Project (optional)
├── Task (optional)
└── ChatThread (optional)

PlatformReviews
└── User (author)
```

### Key Entities

#### User

Central entity representing both developers and companies.

**Key Fields:**

- Dual profile support (DeveloperProfile OR CompanyProfile)
- Email verification status
- Password hash (bcrypt)
- Relationships to owned projects, tasks, applications, reviews

#### DeveloperProfile

Extended information for developers.

**Features:**

- Skills with proficiency levels
- Experience level (STUDENT, JUNIOR, MIDDLE, SENIOR)
- Availability status
- Aggregate rating from company reviews
- Avatar upload support (Cloudinary)

#### CompanyProfile

Extended information for companies.

**Features:**

- Company type (STARTUP, SMB, ENTERPRISE, INDIVIDUAL)
- Team size
- Verified status
- Aggregate rating from developer reviews
- Logo upload support (Cloudinary)

#### Task

Core entity representing work opportunities.

**Lifecycle States:**

- DRAFT → PUBLISHED → IN_PROGRESS → COMPLETION_REQUESTED → COMPLETED
- Alternative: FAILED, CLOSED, DELETED

**Key Features:**

- Belongs to a project (optional)
- Technology requirements (required/nice-to-have)
- One accepted application
- Automatic state transitions
- Rejection counter (max 3 attempts)

#### Application

Developer's proposal to work on a task.

**Status Flow:**

- APPLIED → ACCEPTED/REJECTED

**Features:**

- Custom message and execution plan
- One application per developer per task (enforced by DB)
- Automatic task state update on acceptance

#### ChatThread

Real-time communication channel for active tasks.

**Features:**

- One thread per task
- Messages with persona attribution (developer/company)
- Read tracking per user
- Ordered by last message timestamp

#### Review

Post-task feedback mechanism.

**Features:**

- 1-5 star rating
- Optional text feedback
- Bidirectional (company ↔ developer)
- Automatically updates aggregate ratings on profiles

#### Technology

Normalized catalog of technologies/skills.

**Features:**

- Type classification (BACKEND, FRONTEND, DEVOPS, etc.)
- Popularity scoring
- Community suggestions with approval workflow
- Used for matching and filtering

#### Notification

Event notification system.

**Notification Types:**

- Application events (created, accepted, rejected)
- Task events (completion requested, completed)
- Invite events (created, accepted, declined)
- Chat messages
- Reviews

#### PlatformReview

User feedback about the platform itself (not about other users).

**Features:**

- 1-5 star rating
- Text feedback
- Approval system (default: unapproved, requires admin approval)
- Cooldown period between reviews (configurable, default: 30 days)
- Only approved reviews visible to public
- Owners can edit unapproved reviews
- Admins can approve, edit, and delete any review

---

## Data Flow Examples

### Task Creation → Completion Flow

```
1. Company creates task (DRAFT)
   └─> Task record created

2. Company publishes task
   └─> Status: DRAFT → PUBLISHED
   └─> publishedAt timestamp set
   └─> Project.publishedTasksCount incremented

3. Developer applies
   └─> Application record created
   └─> Notification sent to company

4. Company accepts application
   └─> Application.status: APPLIED → ACCEPTED
   └─> Task.status: PUBLISHED → IN_PROGRESS
   └─> Task.acceptedApplicationId set
   └─> ChatThread created
   └─> Notification sent to developer

5. Developer requests completion
   └─> Task.status: IN_PROGRESS → COMPLETION_REQUESTED
   └─> Notification sent to company

6. Company marks complete
   └─> Task.status: COMPLETION_REQUESTED → COMPLETED
   └─> completedAt timestamp set
   └─> Notification sent to developer

7. Both parties leave reviews
   └─> Review records created
   └─> Aggregate ratings recalculated
```

### Authentication Flow

```
1. User signs up
   └─> User record created (emailVerified: false)
   └─> VerificationToken created
   └─> Email sent

2. User verifies email
   └─> Token validated and marked as used
   └─> User.emailVerified: true

3. User logs in
   └─> Credentials validated
   └─> Access token generated (JWT, 15 min)
   └─> Refresh token created in DB
   └─> refresh_token cookie set (HTTP-only)

4. Access token expires
   └─> Frontend calls /auth/refresh
   └─> Old refresh token validated & revoked
   └─> New refresh token created
   └─> New access token returned
   └─> New refresh_token cookie set

5. User logs out
   └─> Refresh token revoked (revokedAt set)
   └─> Cookie cleared
```

---

## Technology Stack Justification

### Why Prisma?

- Type-safe database access
- Excellent migration workflow
- Built-in connection pooling
- Prevents SQL injection by design
- Great developer experience

### Why JWT + Refresh Tokens?

- Stateless authentication
- Horizontal scaling friendly
- Industry standard
- Secure with rotation

### Why Joi?

- Schema-based validation
- Clear error messages
- Easy to test
- Works well with Express

### Why Testcontainers?

- True database isolation in tests
- No shared state between test runs
- Tests run against real PostgreSQL
- Catches database-specific bugs

### Why Node-Cron?

- In-process scheduling (no external dependencies)
- Simple for periodic cleanup tasks
- Sufficient for current needs
- Can migrate to external scheduler if needed

---

## Security Architecture

### Authentication Security

- Passwords hashed with bcrypt (10 rounds)
- Access tokens expire in 15 minutes
- Refresh tokens rotate on every use
- HTTP-only cookies prevent XSS attacks
- Expired tokens cleaned up automatically

### Authorization

- JWT payload contains user ID only (minimal exposure)
- Persona header validates user role per request
- Service layer checks ownership before mutations
- Database constraints prevent unauthorized data manipulation

### Input Validation

- All inputs validated with Joi schemas
- Prisma prevents SQL injection
- File uploads validated (type, size)
- Cloudinary handles image sanitization

### CORS

- Whitelist of allowed origins
- Credentials support enabled for cookies
- Specific allowed headers (Authorization, X-Persona)

---

## Performance Considerations

### Database

- Indexes on frequently queried fields
- Composite indexes for common query patterns
- Connection pooling via Prisma
- Soft deletes with deletedAt filters

### Caching Strategy (Future)

- Redis for frequently accessed data
- Cache invalidation on mutations
- Session storage if moving from JWT

### Pagination (Future)

- Cursor-based pagination for large lists
- Limit default query results

---

## Scalability

### Current State

- Stateless API (horizontal scaling ready)
- Database connection pooling
- No in-memory session storage

### Future Enhancements

- Load balancer (Nginx, ALB)
- Read replicas for PostgreSQL
- Redis for caching and sessions
- CDN for static assets (Cloudinary already used)
- Microservices extraction (chat, notifications)

---

[← Back to README](../README.md)
