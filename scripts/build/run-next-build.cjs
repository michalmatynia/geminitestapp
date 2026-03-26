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
    const child = spawn(process.execPath, [nextBin, ...args], {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: buildEnv,
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

const shouldRetryWithWebpack = (result) =>
  result.bundler !== 'webpack' &&
  result.code !== 0 &&
  !result.signal &&
  turbopackManifestWriteRacePattern.test(result.output);

const main = async () => {
  const preferredBundler =
    forcedBundler === 'webpack' || forcedBundler === 'turbopack'
      ? forcedBundler
      : 'turbopack';

  const initialResult = await runBuild(preferredBundler);

  if (initialResult.signal) {
    process.kill(process.pid, initialResult.signal);
    return;
  }

  if (initialResult.code === 0) {
    process.exit(0);
  }

  if (!shouldRetryWithWebpack(initialResult)) {
    process.exit(initialResult.code);
  }

  console.warn(
    '[run-next-build] Turbopack hit a manifest write race. Cleaning the dist dir and retrying with webpack.'
  );
  removeDistDir();

  const retryResult = await runBuild('webpack');

  if (retryResult.signal) {
    process.kill(process.pid, retryResult.signal);
    return;
  }

  process.exit(retryResult.code);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
