import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildTrackerSummary,
  formatLocalDate,
  upsertRow,
} from './lib/stabilization-track.mjs';
import { runStabilizationGates } from './lib/stabilization-gate-runner.mjs';

const root = process.cwd();
const defaultTrackerPath = 'docs/migrations/stabilization-window-2026-04-17.md';

const args = process.argv.slice(2);
const argMap = new Map();
for (const arg of args) {
  if (!arg.startsWith('--')) continue;
  const [key, value] = arg.split('=');
  argMap.set(key, value ?? 'true');
}

const trackerPath = argMap.get('--tracker') ?? defaultTrackerPath;
const targetDate = argMap.get('--date') ?? formatLocalDate(new Date());

async function main() {
  const result = await runStabilizationGates({
    cwd: root,
    env: process.env,
    logger: console,
    prefix: 'stabilization:track',
  });
  const gatePassed = result.ok;
  const summary = buildTrackerSummary({
    gatePassed,
    canonical: result.canonical,
    ai: result.ai,
    observability: result.observability,
    refreshedAt: result.generatedAt,
  });

  const row = `| ${targetDate} | ${summary.canonicalCell} | ${summary.aiCell} | ${summary.obsCell} | ${summary.notes} |`;
  const absoluteTrackerPath = path.join(root, trackerPath);
  const current = await fs.readFile(absoluteTrackerPath, 'utf8');
  const next = upsertRow(current, targetDate, row);
  await fs.writeFile(absoluteTrackerPath, next, 'utf8');

  console.log(`\n[stabilization:track] tracker updated: ${trackerPath} (${targetDate})`);

  if (!gatePassed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[stabilization:track] failed: ${message}`);
  process.exit(1);
});
