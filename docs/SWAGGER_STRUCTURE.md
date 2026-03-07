# Swagger Structure

This project keeps OpenAPI docs modular to avoid a single oversized file.

## Entry Point

- Main aggregator: `src/docs/swagger.js`
- It imports and merges all path/schema modules into `createSwaggerSpec(...)`.

## Folder Layout

```text
src/docs/swagger/
  constants.js
  paths/
    auth.paths.js
    health.paths.js
    me.paths.js
    profiles.paths.js
    projects.paths.js
    tasks.paths.js
    technologies.paths.js
    workflows.paths.js
  schemas/
    auth.schemas.js
    health.schemas.js
    technologies.schemas.js
    profiles.schemas.js
    projects.schemas.js
    tasks.schemas.js
    applications.schemas.js
    invites.schemas.js
    me.schemas.js
    reviews.schemas.js
    shared.schemas.js
```

## Rules

1. Keep each domain in its own `*.paths.js` and `*.schemas.js` file.
2. Export plain objects (`authPaths`, `tasksSchemas`, etc.).
3. Register new modules in `src/docs/swagger.js` via imports + spread merge.
4. Put shared enums/constants in `src/docs/swagger/constants.js`.
5. Reuse schemas via `$ref` instead of duplicating definitions.

## How To Add A New Endpoint

1. Add/extend route docs in the relevant file under `src/docs/swagger/paths/`.
2. Add/update request/response models in the matching file under `src/docs/swagger/schemas/`.
3. If needed, add shared values to `constants.js` and import them.
4. Ensure the module is included in `src/docs/swagger.js`.
5. Run checks:

```bash
npm run lint
```

Optionally verify generated spec at runtime:

- Swagger UI: `/api/v1/docs`
