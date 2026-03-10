import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-node-toolchain-sync.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'node-toolchain-sync-'));
  tempRoots.push(root);
  return root;
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

const runScript = (cwd: string) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

describe('Node toolchain sync check', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes when node version files and engines.node are aligned', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
            bun: '1.3.10',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Node toolchain pins are aligned');
  });

  it('fails when .node-version drifts from .nvmrc', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '23\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
            bun: '1.3.10',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Node version files are out of sync');
  });

  it('fails when package.json engines.node excludes the pinned major', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <22',
            bun: '1.3.10',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not include the pinned Node major 22');
  });

  it('fails when .tool-versions nodejs drifts from .nvmrc', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 23\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
            bun: '1.3.10',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.tool-versions nodejs entry (23) does not match the pinned Node major 22');
  });

  it('fails when .tool-versions bun drifts from .bun-version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.9\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
            bun: '1.3.10',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.tool-versions bun entry (1.3.9) does not match .bun-version (1.3.10)');
  });

  it('fails when package.json engines.bun drifts from .bun-version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
            bun: '1.3.9',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json engines.bun="1.3.9" does not match .bun-version (1.3.10)');
  });

  it('fails when package.json engines.bun is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22\n');
    writeFile(root, '.node-version', '22\n');
    writeFile(root, '.bun-version', '1.3.10\n');
    writeFile(root, '.tool-versions', 'nodejs 22\nbun 1.3.10\n');
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '>=20.9 <24',
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.bun');
  });
});
