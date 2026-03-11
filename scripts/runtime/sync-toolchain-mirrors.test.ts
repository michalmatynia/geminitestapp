import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'sync-toolchain-mirrors.cjs');
const expectedNodeVersion = fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
const expectedBunVersion = fs.readFileSync(path.join(repoRoot, '.bun-version'), 'utf8').trim();
const mismatchedNodeVersion =
  Number.parseInt(expectedNodeVersion, 10) === 21 ? '22' : String(Number.parseInt(expectedNodeVersion, 10) - 1);
const mismatchedBunVersion = expectedBunVersion === '1.3.9' ? '1.3.8' : '1.3.9';

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
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.node-version', `${mismatchedNodeVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${mismatchedNodeVersion}\nbun ${mismatchedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .node-version, .tool-versions.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('reports a no-op when mirror files are already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Toolchain mirror files are already aligned.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('updates only .node-version when the combined toolchain file is already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.node-version', `${mismatchedNodeVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .node-version.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('updates only .tool-versions when .node-version is already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${mismatchedNodeVersion}\nbun ${mismatchedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .tool-versions.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('creates missing mirror files from the canonical pins', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .node-version, .tool-versions.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('creates only the missing combined toolchain file when .node-version is already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .tool-versions.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('creates only the missing .node-version file when .tool-versions is already aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Synced toolchain mirror files: .node-version.');
    expect(readFile(root, '.node-version')).toBe(`${expectedNodeVersion}\n`);
    expect(readFile(root, '.tool-versions')).toBe(`nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
  });

  it('fails when the canonical version pins are missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .bun-version');
  });

  it('fails when the canonical Node pin is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .nvmrc');
  });
});
