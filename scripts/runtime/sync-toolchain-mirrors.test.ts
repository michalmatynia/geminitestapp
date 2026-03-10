import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'sync-toolchain-mirrors.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toolchain-mirror-sync-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

const readFile = (root: string, relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

const runScript = (cwd: string) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

describe('sync toolchain mirrors', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('rewrites mirrored version files from the canonical Node and Bun pins', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.node-version', '21\n');
    writeFile(root, '.tool-versions', 'nodejs 21\nbun 1.3.9\n');

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .node-version, .tool-versions.');
    expect(readFile(root, '.node-version')).toBe('22\n');
    expect(readFile(root, '.tool-versions')).toBe('nodejs 22\nbun 1.3.10\n');
  });

  it('reports a no-op when mirror files are already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Toolchain mirror files are already aligned.');
    expect(readFile(root, '.node-version')).toBe('22\n');
    expect(readFile(root, '.tool-versions')).toBe('nodejs 22\nbun 1.3.10\n');
  });

  it('fails when the canonical version pins are missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .bun-version');
  });
});
