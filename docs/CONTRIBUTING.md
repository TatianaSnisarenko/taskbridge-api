# Contributing to TeamUp Backend

[← Back to README](../README.md)

Thank you for considering contributing to TeamUp Backend. This document provides guidelines and standards for contributing to the project.

## Code of Conduct

- Be respectful and professional
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect differing viewpoints and experiences

## How to Contribute

### Reporting Bugs

**Before submitting a bug report:**

- Check if the issue already exists
- Verify it's not a configuration issue
- Test with the latest version

**Bug Report Template:**

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:

1. Call endpoint '...'
2. With payload '...'
3. Observe error '...'

**Expected behavior**
What should have happened.

**Environment:**

- Node version: [e.g., 20.10.0]
- OS: [e.g., Windows 11, macOS 14]
- Database: [e.g., PostgreSQL 16]

**Additional context**
Logs, screenshots, etc.
```

### Suggesting Features

**Feature Request Template:**

```markdown
**Problem this feature solves**
Describe the use case.

**Proposed solution**
How would you implement it?

**Alternatives considered**
Other approaches you thought about.

**Impact**
Who benefits from this feature?
```

### Pull Requests

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Follow project standards** (see below)
5. **Write/update tests**
6. **Ensure all tests pass:**
   ```bash
   npm run lint
   npm run test:coverage
   ```
7. **Commit with conventional commits** (see below)
8. **Push and open a PR**

---

## Development Standards

### Project Architecture

TeamUp IT follows a strict **layered architecture**. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.

**Layer Responsibilities:**

```
Routes      → Define endpoints, wire middleware, bind controllers
Controllers → Extract request data, call services, map responses
Services    → Business logic, transactions, authorization
Prisma      → Data access only
```

**Rules:**

- ✅ Controllers call services
- ✅ Services contain all business logic
- ✅ Services call Prisma for data access
- ❌ Controllers never call Prisma directly
- ❌ Routes never contain business logic

### Code Style

#### JavaScript

- **ES Modules:** Use `import/export` (not `require`)
- **File Extensions:** Always include `.js` in imports
  ```javascript
  import { userService } from './services/user.service.js';
  ```
- **Async/Await:** Prefer over promises/callbacks
- **Arrow Functions:** Use for short functions
- **Destructuring:** Use where it improves readability

#### Naming Conventions

| Type            | Convention       | Example           |
| --------------- | ---------------- | ----------------- |
| Files           | kebab-case       | `auth.service.js` |
| Classes         | PascalCase       | `UserService`     |
| Functions       | camelCase        | `createUser()`    |
| Variables       | camelCase        | `userId`          |
| Constants       | UPPER_SNAKE_CASE | `MAX_ATTEMPTS`    |
| Database Fields | snake_case       | `created_at`      |
| API Fields      | camelCase        | `createdAt`       |

#### Comments

- **Avoid obvious comments** – code should be self-documenting
- **Document "why", not "what"**

  ```javascript
  // ✅ Good
  // Retry 3 times to handle transient network failures
  const maxRetries = 3;

  // ❌ Bad
  // Set max retries to 3
  const maxRetries = 3;
  ```

- **Use JSDoc for complex functions:**
  ```javascript
  /**
   * Accepts an application and transitions task to IN_PROGRESS.
   * Rejects all other applications automatically.
   *
   * @param {string} applicationId - Application UUID
   * @param {string} companyUserId - Company user ID (for authorization)
   * @returns {Promise<Application>} Accepted application
   * @throws {Error} If application not found or already processed
   */
  async acceptApplication(applicationId, companyUserId) {
    // ...
  }
  ```

### Validation

- **All inputs must be validated** with Joi schemas
- **Schemas belong in** `src/schemas/`
- **Apply validation** at route level with middleware
- **Error messages** should be clear and actionable

### Authentication, Persona, and Role Rules

- Use authentication middleware for every protected route.
- Use `requirePersona(...)` only for business actions that depend on active persona context (`developer` / `company`).
- Use role-based middleware for moderation and platform administration endpoints (`ADMIN`, `MODERATOR`).
- Do not use persona headers as a substitute for platform roles.

**Example:**

```javascript
// src/schemas/task.schema.js
export const createTaskSchema = Joi.object({
  title: Joi.string().min(5).max(200).required().messages({
    'string.min': 'Title must be at least 5 characters',
    'string.max': 'Title must not exceed 200 characters',
    'any.required': 'Title is required',
  }),
  description: Joi.string().min(20).required(),
  type: Joi.string().valid('PAID', 'UNPAID', 'VOLUNTEER', 'EXPERIENCE').required(),
});
```

### Error Handling

- **Use custom error classes** for different error types
- **Errors propagate to error middleware**
- **Return appropriate HTTP status codes**

**Example:**

```javascript
// services/task.service.js
async getTask(taskId) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  if (task.deletedAt) {
    throw new GoneError('Task has been deleted');
  }

  return task;
}
```

### Testing

#### Unit Tests

- **Test services in isolation**
- **Mock Prisma calls**
- **Focus on business logic edge cases**

**Example:**

```javascript
// tests/unit/task.service.test.js
describe('TaskService.createTask', () => {
  it('should create task in DRAFT status', async () => {
    const mockTask = { id: 'uuid', status: 'DRAFT' };
    prisma.task.create = jest.fn().mockResolvedValue(mockTask);

    const result = await taskService.createTask(userId, taskData);

    expect(result.status).toBe('DRAFT');
    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'DRAFT',
        ownerUserId: userId,
      }),
    });
  });
});
```

#### Integration Tests

- **Test full HTTP request/response cycle**
- **Use Testcontainers** for real PostgreSQL
- **Test authentication/authorization**
- **Clean up data between tests**

**Example:**

```javascript
// tests/integration/tasks.test.js
describe('POST /api/v1/tasks', () => {
  it('should create draft task for authenticated company', async () => {
    const company = await createTestUser('company');
    const token = generateToken(company);

    const response = await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Persona', 'company')
      .send({
        title: 'Build REST API',
        description: 'Need experienced developer...',
        type: 'PAID',
      });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('DRAFT');
  });
});
```

#### Coverage Requirements

All PRs must maintain coverage thresholds:

- **Statements:** 90%
- **Branches:** 80%
- **Functions:** 95%
- **Lines:** 90%

### Database Changes

#### Prisma Schema

- **Always create a migration** for schema changes
- **Use descriptive migration names:**
  ```bash
  npm run prisma:migrate:dev -- --name add_user_preferences
  ```
- **Test migrations:**
  ```bash
  npx prisma migrate reset  # Clean slate
  npx prisma migrate dev    # Apply migrations
  npm run db:seed           # Verify seed works
  ```

#### Migration Best Practices

- One logical change per migration
- Make migrations reversible when possible
- Add indexes for foreign keys and frequently queried fields
- Use appropriate field types

**Example schema change:**

```prisma
model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  // New field
  timezone  String?  @default("UTC")

  @@index([email])  // Add index for performance
}
```

### Commit Messages

Follow **Conventional Commits** specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation changes
- `style` – Code style (formatting, missing semi-colons)
- `refactor` – Code refactoring
- `test` – Adding/updating tests
- `chore` – Maintenance tasks

**Examples:**

```
feat(auth): add password reset functionality

Implement password reset flow with email token.
Tokens expire after 30 minutes.

Closes #42


fix(tasks): prevent duplicate applications

Add unique constraint on (taskId, developerUserId).

Fixes #87


docs(api): update authentication examples

Add curl examples for all auth endpoints.
```

### Pull Request Guidelines

**PR Title:**

```
feat(tasks): add task completion workflow
```

**PR Description Template:**

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made

- Added `POST /tasks/:taskId/completion/request`
- Added `POST /tasks/:taskId/completion/confirm`
- Added moderation checks for dispute/report resolution
- Updated task state transitions and tests

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All tests pass locally

## Checklist

- [ ] Code follows project style guide
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] `README` and affected `docs/*` pages updated for contract changes
- [ ] No new warnings generated
- [ ] **Linter passes** (`npm run lint`)
- [ ] **All tests pass** (`npm run test:coverage`)
- [ ] Coverage thresholds maintained (90/80/95/90)

## Screenshots (if applicable)
```

---

## Getting Help

- **Read the docs:** [DEVELOPMENT.md](DEVELOPMENT.md), [ARCHITECTURE.md](ARCHITECTURE.md)
- **Open a discussion:** For questions before implementation
- **Ask in PR comments:** For feedback on specific code

---

## Development Workflow

### Setting Up Your Environment

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed setup instructions.

### Making Changes

1. **Pull latest changes:**

   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**

   ```bash
   git checkout -b feat/add-feature
   ```

3. **Make changes and commit often:**

   ```bash
   git add .
   git commit -m "feat(scope): add feature part 1"
   ```

4. **Keep branch updated:**

   ```bash
   git fetch origin main
   git rebase origin/main
   ```

5. **Push and create PR:**
   ```bash
   git push origin feat/add-feature
   ```

### Code Review Process

1. **Automated CI checks run** (all must pass before merge):

- ✅ **Lint:** ESLint + docs English checks + Swagger/Joi consistency
- ✅ **Tests:** Full test suite (unit + integration)
- ✅ **Coverage:** Statements (90%), Branches (80%), Functions (95%), Lines (90%)

2. **Reviewer provides feedback**
3. **You make requested changes**
4. **Approval required** before merge
5. **Squash and merge** into main

### After Merge

- **Delete your branch**
- **Close related issues**
- **Update documentation** if needed

---

## Coding Standards Quick Reference

### DO

✅ Write self-documenting code
✅ Keep functions small and focused
✅ Use meaningful variable names
✅ Validate all inputs with Joi
✅ Write tests for new features
✅ Follow layered architecture
✅ Use async/await
✅ Handle errors properly
✅ Use Prisma transactions for multi-step operations
✅ Add database indexes for performance

### DON'T

❌ Put business logic in controllers
❌ Call Prisma from controllers
❌ Skip input validation
❌ Write tests without assertions
❌ Commit commented-out code
❌ Hardcode configuration values
❌ Expose sensitive data in responses
❌ Skip error handling
❌ Use `console.log` for production logging

---

## Resources

- **Project Standards:** [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md)
- **Development Setup:** [DEVELOPMENT.md](DEVELOPMENT.md)
- **Architecture Guide:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **API Documentation:** [API.md](API.md)
- **Deployment Guide:** [DEPLOYMENT.md](DEPLOYMENT.md)

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

[← Back to README](../README.md)
