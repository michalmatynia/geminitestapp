/**
 * prebuild-cleanup.cjs
 *
 * Runs automatically before `npm run build` via the "prebuild" script.
 * Removes stale .next artifacts that can cause next build to hang or deadlock
 * inside Vercel build containers (and locally when switching branches).
 *
 * Safe to run unconditionally:
 * - .next/lock   — a stale lock from a prior interrupted build will cause
 *                  the new build process to wait indefinitely.
 * - .next/standalone — large traced-output directory; stale copy can cause
 *                      disk churn and inflate build duration on Vercel.
 * - .next/trace-build — stale trace artifacts from previous runs.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const STALE_PATHS = [
  path.join(ROOT, '.next', 'lock'),
  path.join(ROOT, '.next', 'standalone'),
  path.join(ROOT, '.next', 'trace-build'),
];

let removed = 0;

for (const target of STALE_PATHS) {
  try {
    fs.rmSync(target, { recursive: true, force: true });
    // rmSync with force:true does not throw when path is missing, but we
    // check existence first so we can log what was actually cleaned up.
    removed++;
  } catch (err) {
    // Non-fatal: if removal fails for any reason, log and continue.
    process.stderr.write(`prebuild-cleanup: warning: could not remove ${target}: ${err.message}\n`);
  }
}

if (removed > 0) {
  process.stdout.write(`prebuild-cleanup: cleaned ${removed} stale .next artifact path(s).\n`);
}
