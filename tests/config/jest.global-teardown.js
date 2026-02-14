import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export default async function globalTeardown() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const statePath = path.join(rootDir, 'tests', '.tmp', 'testcontainer-state.json');

  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const state = JSON.parse(raw);
    if (state?.containerId) {
      await execFileAsync('docker', ['rm', '-f', state.containerId], { cwd: rootDir });
    }
  } catch {
    // Ignore teardown errors to avoid masking test results.
  }

  try {
    await fs.unlink(statePath);
  } catch {
    // Ignore missing state file.
  }
}
