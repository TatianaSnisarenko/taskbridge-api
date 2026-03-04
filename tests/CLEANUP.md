# Test Container Cleanup

## Problem

When running integration tests with testcontainers, if tests crash or are interrupted (Ctrl+C), the Docker containers may not be cleaned up properly, leading to:

- Orphaned containers consuming resources
- Database connection deadlocks on subsequent test runs
- Port conflicts

## Solution

We've implemented multiple cleanup mechanisms:

### 1. Automatic Cleanup on Test Completion ✅

The global teardown automatically removes test containers when tests finish normally.

### 2. Signal Handler Cleanup (Ctrl+C) ✅

When you press `Ctrl+C` to interrupt tests:

- Signal handlers (SIGINT/SIGTERM) catch the interruption
- Test container is removed before process exits
- State file is cleaned up

### 3. Orphan Cleanup on Next Run ✅

When starting a new test run:

- Setup checks for orphaned containers from previous runs
- Cleans them up before creating a new container
- Prevents accumulation of zombie containers

### 4. Manual Cleanup Script ✅

Run this command anytime to clean up orphaned test containers:

```bash
npm run test:cleanup
```

This script:

- Removes containers referenced in state file
- Finds all `postgres:16-alpine` containers
- Skips production container (port 5432)
- Removes test containers safely

## How It Works

### Container Identification

**Production Container:**

- Uses standard port mapping: `0.0.0.0:5432->5432/tcp`
- Never removed by cleanup scripts

**Test Containers:**

- Use random port mappings: `0.0.0.0:32876->5432/tcp`
- Image: `postgres:16-alpine`
- Removed by cleanup mechanisms

### State File

Located at: `tests/.tmp/testcontainer-state.json`

Contains:

```json
{
  "containerId": "abc123...",
  "databaseUrl": "postgresql://..."
}
```

## Usage

### Normal Test Run

```bash
npm test
```

- Creates fresh container
- Runs migrations
- Executes tests
- Cleans up automatically

### Interrupted Tests (Ctrl+C)

- Signal handler catches interruption
- Container removed automatically
- Next run starts clean

### Manual Cleanup

```bash
npm run test:cleanup
```

Use when:

- Tests crashed unexpectedly
- You see deadlock errors
- Docker shows orphaned postgres containers

### Check for Orphaned Containers

```bash
docker ps -a --filter "ancestor=postgres:16-alpine"
```

## Troubleshooting

### "Deadlock detected" errors

**Cause:** Orphaned containers from previous interrupted test runs

**Solution:**

```bash
npm run test:cleanup
npm test
```

### Tests hang at startup

**Cause:** Old container still running with migrations

**Solution:**

```bash
npm run test:cleanup
npm test
```

### Port conflicts

**Cause:** Multiple test containers running

**Solution:**

```bash
npm run test:cleanup
docker ps -a  # Verify cleanup
npm test
```

## Technical Details

### Files Modified

1. **`tests/config/jest.global-setup.js`**
   - Added orphan cleanup before starting new container
   - Added signal handlers for Ctrl+C
   - Added logging for better visibility

2. **`tests/config/jest.global-teardown.js`**
   - Extracted cleanup logic to reusable function
   - Added logging
   - Export `cleanupTestContainer()` for reuse

3. **`tests/cleanup-containers.js`**
   - Standalone cleanup script
   - Identifies and removes test containers
   - Protects production container

4. **`package.json`**
   - Added `test:cleanup` script

### Cleanup Strategy

```
Test Start
    ↓
┌───────────────────────┐
│ Check for orphans     │
│ (from previous runs)  │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Create new container  │
│ Run migrations        │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Setup signal handlers │
│ (Ctrl+C protection)   │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Run tests             │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Teardown cleanup      │
│ (normal exit)         │
└───────────────────────┘
```

## Best Practices

1. **Always use `npm test`** - don't run Jest directly
2. **Use Ctrl+C to stop** - signal handlers will cleanup
3. **Run `npm run test:cleanup`** if you see deadlocks
4. **Don't manually remove testcontainer state file** - let scripts handle it

## Migration Note

The `ALTER TYPE RENAME` migration is particularly sensitive to locks because it:

- Requires ACCESS EXCLUSIVE lock on all tables using the enum
- Can cause deadlocks with concurrent operations
- Why proper cleanup is critical for this migration

Now with automatic cleanup, this migration (and future ones) will run reliably even after test interruptions.
