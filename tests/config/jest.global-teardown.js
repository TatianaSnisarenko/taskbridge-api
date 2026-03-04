import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Cleanup function that can be called from teardown or signal handlers
 */
export async function cleanupTestContainer() {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const statePath = path.join(rootDir, 'tests', '.tmp', 'testcontainer-state.json');

  let cleaned = false;

  try {
    const raw = await fs.readFile(statePath, 'utf8');
    const state = JSON.parse(raw);

    if (state?.containerId) {
      console.log(`[Cleanup] Removing test container: ${state.containerId}`);
      await execFileAsync('docker', ['rm', '-f', state.containerId], { cwd: rootDir });
      console.log('[Cleanup] Test container removed successfully');
      cleaned = true;
    }
  } catch (err) {
    // Only log if it's not a "file not found" error
    if (err.code !== 'ENOENT') {
      console.warn('[Cleanup] Error removing container:', err.message);
    }
  }

  try {
    await fs.unlink(statePath);
    if (!cleaned) {
      console.log('[Cleanup] Removed stale state file');
    }
  } catch {
    // Ignore missing state file
  }

  return cleaned;
}

export default async function globalTeardown() {
  await cleanupTestContainer();
}
