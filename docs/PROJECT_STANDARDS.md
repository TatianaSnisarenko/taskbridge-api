# Project Standards

[← Back to README](../README.md)

This document defines engineering standards for TeamUp Backend. It is intended for all contributors and keeps implementation and review expectations consistent.

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
- Prefer small, incremental changes over broad refactors.

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

### Source of Truth Order

When docs, Swagger, and implementation differ, use this order:

1. route + middleware wiring in `src/routes`
2. Joi schemas in `src/schemas`
3. service behavior in `src/services`
4. Swagger modular docs in `src/docs/swagger`
5. repository docs in `README.md` and `docs/*`

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

### Persona and Role Enforcement

- Persona access (`developer` / `company`) must be enforced through persona middleware.
- Platform moderation/admin access must be enforced through role middleware (`ADMIN`, `MODERATOR`).
- Persona headers must not be treated as platform role grants.
- When route behavior depends on `owner=true` or similar conditional access, route and service checks must align and be explicitly tested.

### API Contract Consistency

- Keep request/response contracts backward compatible unless a change is explicitly marked as breaking.
- Follow existing field naming in each module (some contracts are snake_case by design).
- If a contract changes, update corresponding Joi schema, controller mapping, integration tests, Swagger docs, and `docs/API.md` in the same PR.
- For user-facing behavior changes, also update `README.md` and relevant operational docs.

## Error Handling Standards

- Use centralized error middleware.
- Throw typed/domain-aware errors from services.
- Avoid leaking sensitive internals in error responses.
- Keep error payloads structured and consistent (`code`, `message`, optional `details`).

## Logging Standards

- Keep logs operational and concise.
- Avoid logging secrets, token values, credentials, or full sensitive payloads.
- Use structured wording that helps diagnose issues in development and CI.

## Security Standards

- Never commit secrets or credentials.
- Use environment variables for all sensitive settings.
- Use secure cookie settings in production.
- Hash passwords and never return secret/token values in responses.
- Apply least-privilege checks for role/persona-specific actions.
- Do not expose moderation capabilities without role checks backed by persisted user roles.

## Database Standards

- Schema changes must go through Prisma migrations.
- Keep migrations small and descriptive.
- Use transactions for multi-step writes requiring atomicity.
- Add indexes for frequent filters/sorts and relation lookups.
- Validate migration impact on seed scripts when schema relations change.

## Testing Standards

- Add/update tests for every behavior change.
- Prefer unit tests as the primary coverage layer (service logic, controller mapping, validation rules, and edge-case permutations).
- Aim for maximum practical unit coverage in changed modules before adding integration scenarios.
- Keep integration tests minimal and contract-focused.
- Integration tests should cover only what integration can uniquely validate:
  - route registration and middleware wiring order
  - auth/persona/validation interaction at HTTP level
  - response contract shape/status mapping
  - cross-layer side effects across controller/service/db boundaries
- Do not duplicate business-rule permutation matrices in integration when equivalent unit coverage already exists.
- Empty placeholders are not allowed in integration suites; remove no-op `describe` blocks.
- Tests must be deterministic and isolated.
- Avoid external network dependencies in tests.
- Keep assertions explicit and meaningful.
- Do not lower coverage thresholds to pass a PR.

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
- For endpoint/workflow changes, update all impacted docs together: `README.md`, `docs/API.md`, and any affected operational guide (`docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `docs/ARCHITECTURE.md`).
- Document known gaps with explicit `TODO:` markers rather than implicit assumptions.

## CI and Quality Gates

- **Lint must pass:** project lint pipeline (`npm run lint`) runs and enforces:
  - Import extensions (`.js` required)
  - Max file size (400 lines for services and tests)
  - English-only content in error messages and validation messages
  - Docs English checks
  - Swagger/Joi consistency checks
- **Test suite must pass:** All unit and integration tests
- **Coverage thresholds enforced by CI must remain green:**
  - Statements: 90%
  - Branches: 80%
  - Functions: 95%
  - Lines: 90%

## Pull Request Scope Standards

- Keep PRs focused on one logical change set.
- Avoid unrelated refactors in feature/fix PRs.
- If unrelated issues are discovered, document them and handle separately.

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
- Ensure any new integration test justifies integration-only value (not unit-test duplication)

---

[← Back to README](../README.md)
