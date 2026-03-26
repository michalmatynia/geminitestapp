#!/usr/bin/env node

const { spawn } = require('node:child_process');

const nextBin = require.resolve('next/dist/bin/next');
const args = ['build'];

const defaultHeap = process.env.VERCEL ? '4096' : '8192';

const child = spawn(process.execPath, [nextBin, ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || `--max-old-space-size=${defaultHeap}`,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
