# Swagger Structure

[Back to README](../README.md)

This project keeps OpenAPI docs modular to avoid a single oversized file.

## Entry Point

- Main aggregator: `src/docs/swagger.js`
- It imports and merges all path/schema modules into `createSwaggerSpec(...)`.
- Swagger UI is mounted at `/api/v1/docs`.

## Folder Layout

```text
src/docs/swagger/
  constants.js
  paths/
    auth.paths.js
    docs.paths.js
    health.paths.js
    me.paths.js
    platform-reviews.paths.js
    profiles.paths.js
    projects.paths.js
    tasks.paths.js
    technologies.paths.js
    timezones.paths.js
    workflows.paths.js
  schemas/
    applications.schemas.js
    auth.schemas.js
    health.schemas.js
    invites.schemas.js
    me.schemas.js
    platform-reviews.schemas.js
    profiles.schemas.js
    projects.schemas.js
    reviews.schemas.js
    shared.schemas.js
    tasks.schemas.js
    technologies.schemas.js
    timezones.schemas.js
```

## Rules

1. Keep each domain in its own `*.paths.js` and `*.schemas.js` file.
2. Export plain objects (`authPaths`, `tasksSchemas`, etc.).
3. Register new modules in `src/docs/swagger.js` via imports + spread merge.
4. Put shared enums/constants in `src/docs/swagger/constants.js`.
5. Reuse schemas via `$ref` instead of duplicating definitions.
6. Keep path docs synchronized with route wiring in `src/routes`.
7. Keep request/response docs synchronized with Joi schemas in `src/schemas`.

## How To Add A New Endpoint

1. Add/extend route docs in the relevant file under `src/docs/swagger/paths/`.
2. Add/update request/response models in the matching file under `src/docs/swagger/schemas/`.
3. If needed, add shared values to `constants.js` and import them.
4. Ensure the module is included in `src/docs/swagger.js`.
5. Run checks:

```bash
npm run lint
npm run check:swagger-joi
```

Optionally verify generated spec at runtime:

- Swagger UI: `/api/v1/docs`

## Common Maintenance Tasks

### Add a new schema component

1. Add component in relevant `src/docs/swagger/schemas/*.schemas.js` file
2. Reuse via `$ref` from paths
3. Keep naming stable (avoid frequent renames)

### Move endpoints between path files

If endpoint ownership changes between domains:

1. Move path object to the new `*.paths.js`
2. Ensure old duplicate key is removed
3. Verify `src/docs/swagger.js` still imports merged object once

### Troubleshooting mismatch errors

If Swagger/Joi consistency check fails:

- verify route exists in `src/routes`
- verify Joi schema shape and required fields
- verify Swagger requestBody/params reflect same constraints
- verify endpoint path/method is not duplicated in multiple path files
