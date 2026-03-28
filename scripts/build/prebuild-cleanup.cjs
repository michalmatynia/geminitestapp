/**
 * prebuild-cleanup.cjs
 *
 * Runs automatically before `npm run build` via the "prebuild" script.
 * Removes stale .next artifacts that can cause next build to hang, deadlock,
 * or resolve against compiled output from a previous branch state.
 *
 * Safe to run unconditionally:
 * - .next/lock — a stale lock from a prior interrupted build will cause
 *                the new build process to wait indefinitely.
 * - .next/standalone — large traced-output directory; stale copy can cause
 *                      disk churn and inflate build duration on Vercel.
 * - .next/trace-build — stale trace artifacts from previous runs.
 * - .next/server / .next/static / .next/types — compiled build output that can
 *   survive branch switches and surface phantom module resolution failures.
 * - .next/trace — stale trace output can make debugging the current build
 *   misleading.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const STALE_PATHS = [
  path.join(ROOT, '.next', 'lock'),
  path.join(ROOT, '.next', 'standalone'),
  path.join(ROOT, '.next', 'trace-build'),
  path.join(ROOT, '.next', 'server'),
  path.join(ROOT, '.next', 'static'),
  path.join(ROOT, '.next', 'types'),
  path.join(ROOT, '.next', 'trace'),
];

let removed = 0;

for (const target of STALE_PATHS) {
  if (!fs.existsSync(target)) {
    continue;
  }

  try {
    fs.rmSync(target, { recursive: true, force: true });
    removed++;
  } catch (err) {
    // Non-fatal: if removal fails for any reason, log and continue.
    process.stderr.write(`prebuild-cleanup: warning: could not remove ${target}: ${err.message}\n`);
  }
}

if (removed > 0) {
  process.stdout.write(`prebuild-cleanup: cleaned ${removed} stale .next artifact path(s).\n`);
}
