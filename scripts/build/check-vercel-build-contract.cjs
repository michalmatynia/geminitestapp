'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const packageJsonPath = path.join(root, 'package.json');
const vercelConfigPath = path.join(root, 'vercel.json');
const packageLockPath = path.join(root, 'package-lock.json');
const bunLockPath = path.join(root, 'bun.lock');

const readJson = (filePath, label) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    console.error(`[build] Unable to read ${label} at ${filePath}.`);
    if (error instanceof Error && error.message) {
      console.error(error.message);
    }
    process.exit(1);
  }
};

const packageJson = readJson(packageJsonPath, 'package.json');
const vercelConfig = readJson(vercelConfigPath, 'vercel.json');

const packageManager = packageJson?.packageManager;
const framework = vercelConfig?.framework;
const installCommand = vercelConfig?.installCommand;
const buildCommand = vercelConfig?.buildCommand;

const fail = (message) => {
  console.error(`[build] ${message}`);
  process.exit(1);
};

if (typeof packageManager !== 'string' || !packageManager.startsWith('npm@')) {
  fail(`package.json packageManager must stay pinned to npm. Received "${packageManager ?? 'missing'}".`);
}

if (framework !== 'nextjs') {
  fail(`vercel.json framework must be "nextjs". Received "${framework ?? 'missing'}".`);
}

if (installCommand !== 'npm ci') {
  fail(`vercel.json installCommand must be "npm ci". Received "${installCommand ?? 'missing'}".`);
}

if (buildCommand !== 'npm run build') {
  fail(`vercel.json buildCommand must be "npm run build". Received "${buildCommand ?? 'missing'}".`);
}

if (!fs.existsSync(packageLockPath)) {
  fail('package-lock.json must exist at the repo root for the Vercel npm install contract.');
}

console.log(
  `[build] Vercel build contract: framework=${framework} install="${installCommand}" build="${buildCommand}" packageManager=${packageManager} packageLock=${fs.existsSync(packageLockPath) ? 'present' : 'missing'} bunLock=${fs.existsSync(bunLockPath) ? 'present' : 'missing'}`
);
