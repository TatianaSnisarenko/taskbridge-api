import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const TARGETS = [path.join(ROOT, 'README.md'), path.join(ROOT, 'docs')];
const CYRILLIC_REGEX = /[\u0400-\u04FF]/;

function stripMarkdownNoise(line) {
  return line
    .replace(/`[^`]*`/g, '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/https?:\/\/\S+/g, '');
}

async function collectMarkdownFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdownFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      files.push(entryPath);
    }
  }

  return files;
}

function findViolations(content, filePath) {
  const violations = [];
  const lines = content.split(/\r?\n/);
  let inCodeFence = false;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence;
      return;
    }

    if (inCodeFence || !line) {
      return;
    }

    const cleaned = stripMarkdownNoise(rawLine);
    if (CYRILLIC_REGEX.test(cleaned)) {
      violations.push({
        filePath,
        line: index + 1,
        text: rawLine,
      });
    }
  });

  return violations;
}

async function main() {
  const markdownFiles = [];

  for (const target of TARGETS) {
    const targetStat = await stat(target);
    if (targetStat.isFile()) {
      markdownFiles.push(target);
      continue;
    }
    markdownFiles.push(...(await collectMarkdownFiles(target)));
  }

  const allViolations = [];

  for (const filePath of markdownFiles) {
    const content = await readFile(filePath, 'utf8');
    allViolations.push(...findViolations(content, filePath));
  }

  if (allViolations.length === 0) {
    return;
  }

  console.error('❌ Non-English (Cyrillic) content found in markdown docs:');
  for (const violation of allViolations) {
    const relativeFile = path.relative(ROOT, violation.filePath).replaceAll('\\', '/');
    console.error(`- ${relativeFile}:${violation.line} -> ${violation.text.trim()}`);
  }

  process.exit(1);
}

main().catch((error) => {
  console.error('❌ Failed to run markdown English check:', error.message);
  process.exit(1);
});
