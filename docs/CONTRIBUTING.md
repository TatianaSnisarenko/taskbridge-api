# Contributing to TeamUp Backend

[Back to README](../README.md)

Thanks for contributing. This guide describes the expected workflow and quality bar for code and documentation changes.

## Contribution Types

- bug reports
- feature proposals
- code improvements
- tests
- documentation updates

## Before You Start

- check existing issues/PRs for duplicates
- sync with latest `main`
- read [DEVELOPMENT.md](DEVELOPMENT.md), [ARCHITECTURE.md](ARCHITECTURE.md), and [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md)

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d db
npm run prisma:generate
npm run prisma:migrate:dev
npm run db:seed
```

On PowerShell use `Copy-Item` instead of `cp`.

## Branching and Commits

Create a topic branch from `main`:

```bash
git checkout main
git pull
git checkout -b feat/short-description
```

Conventional Commit style is preferred:

```text
feat(tasks): add completion escalation validation
fix(auth): rotate refresh token on refresh endpoint
docs(api): update me onboarding endpoints
```

## Pull Request Checklist

Before opening or updating a PR:

- `npm run lint`
- `npm run test:coverage`
- update affected docs (`README.md`, `docs/API.md`, and related guides)
- ensure no secrets or credentials were added
- include concise PR description and testing notes

Coverage gates expected by CI:

- statements: 90%
- branches: 80%
- functions: 95%
- lines: 90%

## Code Rules (Short Version)

- keep route modules focused on wiring and middleware
- keep controllers HTTP-focused
- keep business logic in services
- do not call Prisma directly from controllers
- validate request input with Joi schemas in `src/schemas`
- use role middleware for moderation/admin behavior
- use persona middleware for business-context behavior

## Testing Expectations

- add or update unit tests for changed business logic
- add integration tests when endpoint wiring or cross-layer behavior changes
- keep tests deterministic and isolated
- prefer explicit assertions over broad snapshots

## Database Changes

For `prisma/schema.prisma` changes:

```bash
npm run prisma:migrate:dev -- --name short_change_name
```

Also verify seed flow still works:

```bash
npm run db:seed
```

## Documentation Policy

If an API contract, route behavior, workflow, or setup command changes, update docs in the same PR:

- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md` or `docs/DEPLOYMENT.md` when relevant

## Bug Report Template

```markdown
## Summary

Short description of the issue.

## Steps to Reproduce

1. ...
2. ...
3. ...

## Expected Result

What should happen.

## Actual Result

What actually happened.

## Environment

- Node version:
- OS:
- DB:

## Additional Context

Logs, payloads, screenshots, stack traces.
```

## Feature Request Template

```markdown
## Problem

What problem does this solve?

## Proposal

What change do you suggest?

## Alternatives

Any alternatives considered.

## Impact

Who benefits and how?
```

## Getting Help

- review docs in `docs/`
- open a discussion or issue for unclear behavior
- ask focused questions directly in PR comments

## License

By contributing, you agree that your contributions are licensed under the repository license.
