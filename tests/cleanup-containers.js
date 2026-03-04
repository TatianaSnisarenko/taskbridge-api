#!/usr/bin/env node

/**
 * Cleanup Test Containers Script
 *
 * Removes all orphaned postgres:16-alpine test containers.
 * Run this if tests were interrupted and containers weren't cleaned up.
 *
 * Usage:
 *   node tests/cleanup-containers.js
 *   npm run test:cleanup
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

async function cleanupOrphanedContainers() {
  console.log('🧹 Cleaning up orphaned test containers...\n');

  try {
    // 1. Clean up via state file first
    const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    const statePath = path.join(rootDir, 'tests', '.tmp', 'testcontainer-state.json');

    try {
      const raw = await fs.readFile(statePath, 'utf8');
      const state = JSON.parse(raw);
      if (state?.containerId) {
        console.log(`📋 Found state file with container: ${state.containerId.substring(0, 12)}`);
        await execFileAsync('docker', ['rm', '-f', state.containerId]);
        console.log('  ✓ Removed container from state file\n');
      }
      await fs.unlink(statePath);
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.warn('  ⚠ Could not read state file:', err.message);
      }
    }

    // 2. Find all postgres:16-alpine containers (test containers)
    const { stdout } = await execFileAsync('docker', [
      'ps',
      '-a',
      '--filter',
      'ancestor=postgres:16-alpine',
      '--format',
      '{{.ID}}\t{{.Status}}\t{{.Ports}}',
    ]);

    const lines = stdout.trim().split('\n').filter(Boolean);

    if (lines.length === 0) {
      console.log('✅ No orphaned test containers found\n');
      return;
    }

    console.log(`🔍 Found ${lines.length} postgres:16-alpine container(s):\n`);

    const productionPort = '0.0.0.0:5432';
    const containersToRemove = [];

    for (const line of lines) {
      const [id, status, ports] = line.split('\t');

      // Skip production container (mapped to standard 5432 port)
      if (ports && ports.includes(productionPort)) {
        console.log(`  ⏭️  Skipping production container: ${id.substring(0, 12)} (${ports})`);
        continue;
      }

      console.log(`  🗑️  Will remove: ${id.substring(0, 12)} - ${status}`);
      containersToRemove.push(id);
    }

    if (containersToRemove.length === 0) {
      console.log('\n✅ No test containers to remove (only production found)\n');
      return;
    }

    console.log(`\n🧹 Removing ${containersToRemove.length} test container(s)...`);

    for (const id of containersToRemove) {
      try {
        await execFileAsync('docker', ['rm', '-f', id]);
        console.log(`  ✓ Removed ${id.substring(0, 12)}`);
      } catch (err) {
        console.error(`  ✗ Failed to remove ${id.substring(0, 12)}:`, err.message);
      }
    }

    console.log('\n✨ Cleanup completed!\n');
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
}

cleanupOrphanedContainers();
