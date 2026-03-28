#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const nextBin = require.resolve('next/dist/bin/next');
const defaultHeap = process.env.VERCEL ? '4096' : '8192';
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

const buildEnv = {
  ...process.env,
  NODE_OPTIONS: process.env.NODE_OPTIONS || `--max-old-space-size=${defaultHeap}`,
};

const resolveBundlerArgs = (bundler) => {
  if (bundler === 'webpack') {
    return ['build', '--webpack'];
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

const getPreferredBundler = (bundler) =>
  bundler === 'webpack' || bundler === 'turbopack' ? bundler : 'turbopack';

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
  getPreferredBundler,
  resolveBundlerArgs,
  shouldRetryWithWebpack,
  shouldRetryWebpackServerManifestRace,
};
