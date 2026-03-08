# Project Standards

[← Back to README](../README.md)

This document defines public engineering standards for TeamUp IT Backend. It is intended for all contributors and keeps implementation and review expectations consistent.

## Scope

These standards apply to:

- Source code in `src/`
- Database changes in `prisma/`
- Tests in `tests/`
- API documentation in `docs/`

## Core Principles

- Keep architecture layered and predictable.
- Keep controllers thin and business logic in services.
- Validate all external input.
- Prefer deterministic tests over brittle tests.
- Keep public API behavior explicit and documented.

## Architecture Rules

### Layer responsibilities

- `routes` — endpoint declarations and middleware wiring only.
- `controllers` — HTTP translation only (`req`/`res`, service call, response mapping).
- `services` — business rules, authorization decisions, orchestration, transactions.
- `db` / Prisma — data access only.

### Boundaries

- Controllers must not call Prisma directly.
- Routes must not contain business logic.
- Service methods should encapsulate domain behavior and error semantics.
- Repeated complex Prisma queries should be extracted into query helpers (`src/db/queries/`).
- Services organized as domain folders should keep individual modules under 400 lines (ESLint enforced).

### Service Organization

For large domains, services should be organized as folders with specialized modules:

- Each service folder contains an `index.js` that re-exports all modules
- Modules are split by responsibility (CRUD, workflows, catalog, helpers)
- Maximum 400 lines per file (enforced by ESLint `max-lines` rule)
- Common query patterns extracted to `src/db/queries/<domain>.queries.js`

**Example structure:**

```
src/services/
  tasks/
    index.js              # Re-exports all task modules
    task-drafts.js        # Draft creation and publishing
    task-catalog.js       # Browse and search
    workflows/
      application.js      # Application workflow
```

## API and Validation Standards

- Every endpoint must validate `params`, `query`, and `body` where applicable.
- Validation should be implemented with Joi schemas in `src/schemas/`.
- Validation errors should be field-oriented and UI-friendly.
- Protected endpoints must consistently enforce authentication and persona checks.

## Error Handling Standards

- Use centralized error middleware.
- Throw typed/domain-aware errors from services.
- Avoid leaking sensitive internals in error responses.
- Keep error payloads structured and consistent (`code`, `message`, optional `details`).

## Security Standards

- Never commit secrets or credentials.
- Use environment variables for all sensitive settings.
- Use secure cookie settings in production.
- Hash passwords and never return secret/token values in responses.
- Apply least-privilege checks for role/persona-specific actions.

## Database Standards

- Schema changes must go through Prisma migrations.
- Keep migrations small and descriptive.
- Use transactions for multi-step writes requiring atomicity.
- Add indexes for frequent filters/sorts and relation lookups.

## Testing Standards

- Add/update tests for every behavior change.
- Prefer unit tests for service logic and integration tests for endpoint behavior.
- Tests must be deterministic and isolated.
- Avoid external network dependencies in tests.
- Keep assertions explicit and meaningful.

## Code Style Standards

- Use ES Modules (`import/export`) and include `.js` extensions in imports.
- Use clear, descriptive naming.
- Keep functions focused and reasonably small.
- Prefer readability over cleverness.
- Comments should explain **why**, not obvious **what**.

## Documentation Standards

- Keep docs aligned with real behavior.
- Update API docs when request/response contracts change.
- Keep examples minimal, correct, and copy-pasteable.
- Do not reference internal-only or ignored files from public docs.

## CI and Quality Gates

- Lint must pass.
- Test suite must pass.
- Coverage thresholds enforced by CI must remain green.

## Destructive Operations Policy

- Any destructive data operation must be called out in the PR before execution.
- Include: exact command, expected impact, and rollback/recovery plan.
- Production destructive operations are allowed only in a maintenance window with owner confirmation.

---

## Quick Checklist for Contributors

Before opening a PR:

- `npm run lint`
- `npm run test:coverage`
- Update relevant docs (`README` / `docs/*`) if behavior changed
- Ensure new links in docs point only to tracked public files

---

[← Back to README](../README.md)
