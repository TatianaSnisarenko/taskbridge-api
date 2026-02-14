import { GenericContainer, Wait } from 'testcontainers';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export default async function globalSetup() {
  const dbName = 'teamup_test';
  const dbUser = 'teamup';
  const dbPassword = 'teamup';

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

  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const statePath = path.join(rootDir, 'tests', '.tmp', 'testcontainer-state.json');

  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(
    statePath,
    JSON.stringify({ containerId: container.getId(), databaseUrl }, null, 2),
    'utf8'
  );

  const prismaCli = path.join(rootDir, 'node_modules', 'prisma', 'build', 'index.js');
  await execFileAsync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: rootDir,
    env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: 'test' },
  });
}
