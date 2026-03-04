import { GenericContainer, Wait } from 'testcontainers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cleanupTestContainer } from './jest.global-teardown.js';

const execFileAsync = promisify(execFile);

export default async function globalSetup() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const statePath = path.join(rootDir, 'tests', '.tmp', 'testcontainer-state.json');

  // Cleanup any orphaned containers from previous interrupted runs
  console.log('[Setup] Checking for orphaned test containers...');
  const hadOrphans = await cleanupTestContainer();
  if (!hadOrphans) {
    console.log('[Setup] No orphaned containers found');
  }

  // Setup signal handlers for graceful cleanup on Ctrl+C
  const signalHandler = async (signal) => {
    console.log(`\n[Setup] Received ${signal}, cleaning up test container...`);
    await cleanupTestContainer();
    process.exit(128 + (signal === 'SIGINT' ? 2 : 15));
  };

  process.on('SIGINT', signalHandler);
  process.on('SIGTERM', signalHandler);

  const dbName = 'teamup_test';
  const dbUser = 'teamup';
  const dbPassword = 'teamup';

  console.log('[Setup] Starting new test container...');
  const container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_DB: dbName,
      POSTGRES_USER: dbUser,
      POSTGRES_PASSWORD: dbPassword,
    })
    .withExposedPorts(5432)
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const host = container.getHost();
  const port = container.getMappedPort(5432);
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;

  console.log(`[Setup] Test container started: ${container.getId().substring(0, 12)}`);

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({ containerId: container.getId(), databaseUrl }, null, 2),
    'utf8'
  );

  console.log('[Setup] Running migrations...');
  const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
  });
  console.log('[Setup] Migrations completed successfully');
}
