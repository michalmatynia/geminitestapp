/**
 * prebuild-cleanup.cjs
 *
 * Runs automatically before `npm run build` via the "prebuild" script.
 * Removes stale .next artifacts that can cause next build to hang, deadlock,
 * or resolve against compiled output from a previous branch state.
 *
 * On Vercel, only the minimal safe set is cleaned (lock, standalone, trace-build)
 * to preserve the cached build output (.next/server, .next/static) that lets
 * turbopack perform incremental builds instead of full cold rebuilds.
 *
 * Locally, the full set is cleaned because branch switches can leave stale
 * compiled output that surfaces phantom module resolution failures.
 *
 * Safe to run unconditionally:
 * - .next/lock — a stale lock from a prior interrupted build will cause
 *                the new build process to wait indefinitely.
 * - .next/standalone — large traced-output directory; stale copy can cause
 *                      disk churn and inflate build duration on Vercel.
 * - .next/trace-build — stale trace artifacts from previous runs.
 *
 * Local-only cleanup:
 * - .next/server / .next/static / .next/types — compiled build output that can
 *   survive branch switches and surface phantom module resolution failures.
 * - .next/trace — stale trace output can make debugging the current build
 *   misleading.
 * - .next-turbo/* except cache — isolated Turbopack build output used by
 *   smoke/stability checks. Keep distDir/cache so repeated Turbopack runs and
 *   cached CI builds can reuse persistent build artifacts, but clear the rest
 *   of the dist output to avoid inheriting stale manifests or partial compile state.
 *   Set NEXT_PRESERVE_TURBO_CACHE=0 when a fully cold Turbopack rebuild is needed.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const isVercel = Boolean(process.env.VERCEL);
const preserveTurboCache =
  typeof process.env.NEXT_PRESERVE_TURBO_CACHE === 'string'
    ? !['0', 'false'].includes(process.env.NEXT_PRESERVE_TURBO_CACHE.trim().toLowerCase())
    : true;

// Minimal set: safe on all environments including Vercel.
const ALWAYS_CLEAN = [
  path.join(ROOT, '.next', 'lock'),
  path.join(ROOT, '.next', 'standalone'),
  path.join(ROOT, '.next', 'trace-build'),
];

// Extended set: only cleaned locally to avoid destroying Vercel's build cache.
const LOCAL_ONLY_CLEAN = [
  path.join(ROOT, '.next', 'server'),
  path.join(ROOT, '.next', 'static'),
  path.join(ROOT, '.next', 'types'),
  path.join(ROOT, '.next', 'trace'),
];

const STALE_PATHS = isVercel ? ALWAYS_CLEAN : [...ALWAYS_CLEAN, ...LOCAL_ONLY_CLEAN];

const TURBOPACK_DIST_DIR = path.join(ROOT, '.next-turbo');
const TURBOPACK_CACHE_DIR = path.join(TURBOPACK_DIST_DIR, 'cache');

let removed = 0;

const cleanDistDirPreservingCache = (distDir, cacheDir) => {
  if (!fs.existsSync(distDir)) {
    return;
  }

  const entries = fs.readdirSync(distDir, { withFileTypes: true });
  for (const entry of entries) {
    const target = path.join(distDir, entry.name);
    if (target === cacheDir) {
      continue;
    }

    try {
      fs.rmSync(target, { recursive: true, force: true });
      removed++;
    } catch (err) {
      process.stderr.write(`prebuild-cleanup: warning: could not remove ${target}: ${err.message}\n`);
    }
  }
};

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

if (!isVercel) {
  cleanDistDirPreservingCache(TURBOPACK_DIST_DIR, TURBOPACK_CACHE_DIR);

  if (!preserveTurboCache && fs.existsSync(TURBOPACK_DIST_DIR)) {
    try {
      fs.rmSync(TURBOPACK_DIST_DIR, { recursive: true, force: true });
      removed++;
    } catch (err) {
      process.stderr.write(
        `prebuild-cleanup: warning: could not remove ${TURBOPACK_DIST_DIR}: ${err.message}\n`
      );
    }
  }
}

if (removed > 0) {
  process.stdout.write(
    `prebuild-cleanup: cleaned ${removed} stale .next artifact path(s)${isVercel ? ' (Vercel: minimal set)' : ''}.\n`
  );
}
