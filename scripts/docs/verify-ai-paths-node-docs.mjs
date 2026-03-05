import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const workspaceRoot = process.cwd();
const ARTIFACT_PATHS = [
  'docs/ai-paths/semantic-grammar/nodes',
  'docs/ai-paths/node-code-objects-v2',
  'docs/ai-paths/node-code-objects-v3',
];

const runNpmScript = (scriptName) => {
  const result = spawnSync('npm', ['run', scriptName], {
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error(`npm run ${scriptName} failed with exit code ${result.status ?? 'unknown'}.`);
  }
};

const toPosixRelative = (absolutePath) =>
  path.relative(workspaceRoot, absolutePath).split(path.sep).join('/');

const listFilesRecursively = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) return [];
  const result = [];
  const entries = fs.readdirSync(directoryPath, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    const absolutePath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursively(absolutePath));
      continue;
    }
    if (!entry.isFile()) continue;
    result.push(absolutePath);
  }
  return result;
};

const hashFile = (filePath) =>
  createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

const snapshotArtifacts = () => {
  const snapshot = new Map();
  for (const relativePath of ARTIFACT_PATHS) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    const files = listFilesRecursively(absolutePath);
    for (const filePath of files) {
      snapshot.set(toPosixRelative(filePath), hashFile(filePath));
    }
  }
  return snapshot;
};

const compareSnapshots = (baseline, after) => {
  const added = [];
  const removed = [];
  const changed = [];

  for (const [filePath, hash] of after.entries()) {
    if (!baseline.has(filePath)) {
      added.push(filePath);
      continue;
    }
    if (baseline.get(filePath) !== hash) {
      changed.push(filePath);
    }
  }

  for (const filePath of baseline.keys()) {
    if (!after.has(filePath)) {
      removed.push(filePath);
    }
  }

  added.sort((left, right) => left.localeCompare(right));
  removed.sort((left, right) => left.localeCompare(right));
  changed.sort((left, right) => left.localeCompare(right));

  return { added, removed, changed };
};

const formatLines = (lines) => lines.map((line) => `- ${line}`).join('\n');

const main = () => {
  const baseline = snapshotArtifacts();

  runNpmScript('docs:ai-paths:node-docs:generate');
  runNpmScript('docs:ai-paths:node-docs:check');

  const after = snapshotArtifacts();
  const diff = compareSnapshots(baseline, after);

  if (diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0) {
    console.log('AI-Paths node-docs verify passed: no artifact content drift introduced by generation/check pipeline.');
    return;
  }

  console.error('AI-Paths node-docs verify failed: generation/check introduced artifact content drift.');
  if (diff.added.length > 0) {
    console.error('Added files:');
    console.error(formatLines(diff.added));
  }
  if (diff.removed.length > 0) {
    console.error('Removed files:');
    console.error(formatLines(diff.removed));
  }
  if (diff.changed.length > 0) {
    console.error('Changed files:');
    console.error(formatLines(diff.changed));
  }
  process.exit(1);
};

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown_error';
  console.error(`AI-Paths node-docs verify failed: ${message}`);
  process.exit(1);
}
