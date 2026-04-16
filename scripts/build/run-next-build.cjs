#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const nextBin = require.resolve('next/dist/bin/next');
const forcedBundler =
  typeof process.env.NEXT_BUILD_BUNDLER === 'string'
    ? process.env.NEXT_BUILD_BUNDLER.trim().toLowerCase()
    : '';
const distDir = path.resolve(process.cwd(), process.env.NEXT_DIST_DIR || '.next');
const turbopackManifestWriteRacePattern =
  /ENOENT: no such file or directory, open '.*\/\.next\/static\/.*\/_(?:build|ssg)Manifest\.js\.tmp\.[^']+'/;
const turbopackTransientPanicPattern =
  /FATAL:\s+An unexpected Turbopack error occurred[\s\S]*?(?:failed to create symlink|File exists \(os error 17\))/i;
const webpackServerManifestRacePattern =
  /(?:Cannot find module|ENOENT: no such file or directory, open) ['"].*\/\.next\/server\/[^'"]*manifest(?:\.[^'"]+)?['"]/i;

const getDefaultHeapMb = () => {
  const explicitHeapMb = Number.parseInt(process.env.NEXT_BUILD_HEAP_MB ?? '', 10);

  if (Number.isFinite(explicitHeapMb)) {
    return String(Math.max(1024, explicitHeapMb));
  }

  // Vercel's default build machine provides 8 GB of system RAM. Next.js spawns
  // a worker for static page generation that inherits NODE_OPTIONS, so the total
  // memory is roughly 2× this value. 3584 MB × 2 = 7168 MB, leaving ~800 MB
  // for the OS and other processes.
  return process.env.VERCEL ? '3584' : '8192';
};

const buildEnv = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS || `--max-old-space-size=${getDefaultHeapMb()}`,
};

const resolveBundlerArgs = (bundler) => {
  if (bundler === 'webpack') {
    return ['build', '--webpack'];
  }
  if (bundler === 'turbopack') {
    return ['build'];
  }
  return ['build'];
};

const runBuild = (bundler) =>
  new Promise((resolve, reject) => {
    const args = resolveBundlerArgs(bundler);
    const env = {
      ...buildEnv,
    };
    if (bundler === 'turbopack') {
      env.TURBOPACK = '1';
    } else {
      delete env.TURBOPACK;
    }
    const child = spawn(process.execPath, [nextBin, ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
    });

    let output = '';

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(chunk);
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stderr.write(chunk);
    });

    child.on('exit', (code, signal) => {
      resolve({ bundler, code: code ?? 1, signal, output });
    });

    child.on('error', reject);
  });

const removeDistDir = () => {
  try {
    fs.rmSync(distDir, { recursive: true, force: true });
  } catch (error) {
    console.warn(
      `[run-next-build] warning: failed to remove ${distDir} before retry: ${error.message}`
    );
  }
};

const shouldRetryWithWebpack = (result, bundlerOverride = forcedBundler) =>
  bundlerOverride !== 'turbopack' &&
  result.bundler !== 'webpack' &&
  result.code !== 0 &&
  !result.signal &&
  (turbopackManifestWriteRacePattern.test(result.output) ||
    turbopackTransientPanicPattern.test(result.output));

const shouldRetryWebpackServerManifestRace = (result) =>
  result.bundler === 'webpack' &&
  result.code !== 0 &&
  !result.signal &&
  webpackServerManifestRacePattern.test(result.output);

const getPreferredBundler = (bundler) => {
  if (bundler === 'webpack' || bundler === 'turbopack') return bundler;
  // Production builds for this repo currently behave better on webpack than on
  // Turbopack. Default to webpack unless the caller explicitly forces a
  // bundler, so `npm run build` stays reliable in local and CI environments.
  return 'webpack';
};

const main = async () => {
  // Turbopack is the default production path again. Explicit bundler selection
  // still overrides this, and an explicit Turbopack request remains strict:
  // do not mask those failures by falling back to webpack.
  const preferredBundler = getPreferredBundler(forcedBundler);

  console.log(
    `[run-next-build] bundler=${preferredBundler} forcedBundler=${forcedBundler || 'auto'} vercel=${process.env.VERCEL ? '1' : '0'} distDir=${distDir}`
  );

  let result = await runBuild(preferredBundler);

  if (result.signal) {
    process.kill(process.pid, result.signal);
    return;
  }

  if (result.code === 0) {
    process.exit(0);
  }

  if (shouldRetryWithWebpack(result)) {
    console.warn(
      '[run-next-build] Turbopack hit a transient build failure. Cleaning the dist dir and retrying with webpack.'
    );
    removeDistDir();
    result = await runBuild('webpack');

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    if (result.code === 0) {
      process.exit(0);
    }
  }

  if (shouldRetryWebpackServerManifestRace(result)) {
    console.warn(
      '[run-next-build] Webpack hit a transient server manifest race. Retrying webpack once.'
    );
    result = await runBuild('webpack');

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }
  }

  process.exit(result.code);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  getDefaultHeapMb,
  getPreferredBundler,
  resolveBundlerArgs,
  shouldRetryWithWebpack,
  shouldRetryWebpackServerManifestRace,
};
