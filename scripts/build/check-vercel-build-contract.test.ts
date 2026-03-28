import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'build', 'check-vercel-build-contract.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vercel-build-contract-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root: string, relativePath: string, value: unknown) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2), 'utf8');
};

const writeFile = (root: string, relativePath: string, contents = '') => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
};

const runScript = (cwd: string) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

describe('check-vercel-build-contract', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes when the repo is pinned to the expected npm/vercel contract', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'fixture',
      packageManager: 'npm@11.7.0',
    });
    writeJson(root, 'vercel.json', {
      framework: 'nextjs',
      installCommand: 'npm ci',
      buildCommand: 'npm run build',
    });
    writeFile(root, 'package-lock.json', '{}');
    writeFile(root, 'bun.lock', '');

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Vercel build contract');
    expect(result.stdout).toContain('bunLock=present');
  });

  it('fails when vercel.json buildCommand drifts', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'fixture',
      packageManager: 'npm@11.7.0',
    });
    writeJson(root, 'vercel.json', {
      framework: 'nextjs',
      installCommand: 'npm ci',
      buildCommand: 'next build',
    });
    writeFile(root, 'package-lock.json', '{}');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('buildCommand must be "npm run build"');
  });

  it('fails when package-lock.json is missing', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'fixture',
      packageManager: 'npm@11.7.0',
    });
    writeJson(root, 'vercel.json', {
      framework: 'nextjs',
      installCommand: 'npm ci',
      buildCommand: 'npm run build',
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package-lock.json must exist');
  });
});
