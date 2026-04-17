#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');

const { loadEnvConfig } = require('@next/env');

const repoRoot = path.resolve(__dirname, '..', '..');
const appDir = path.join(repoRoot, 'apps', 'studiq-web');
const args = process.argv.slice(2);
const command = args[0] || 'dev';
const isDev = command !== 'build' && process.env.NODE_ENV !== 'production';

loadEnvConfig(repoRoot, isDev);

const nextBin = require.resolve('next/dist/bin/next', {
  paths: [appDir, repoRoot],
});

const child = spawn(process.execPath, [nextBin, ...args], {
  cwd: appDir,
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
