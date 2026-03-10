import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-package-manager-contract.cjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'package-manager-contract-'));
  tempRoots.push(root);
  return root;
};

const writeJson = (root: string, relativePath: string, value: unknown) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, JSON.stringify(value, null, 2), 'utf8');
  return absolutePath;
};

const runScript = (cwd: string) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: process.env,
  });

describe('Package manager contract check', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes when packageManager, engines.npm, and package-lock.json are aligned', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'npm@11.7.0',
      engines: {
        npm: '>=10',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Package manager contract is aligned');
  });

  it('fails when packageManager is missing', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      engines: {
        npm: '>=10',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare packageManager');
  });

  it('fails when packageManager is not pinned to npm', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'bun@1.3.10',
      engines: {
        npm: '>=10',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('packageManager must stay pinned to npm');
  });

  it('fails when packageManager does not satisfy engines.npm', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'npm@9.9.9',
      engines: {
        npm: '>=10',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not satisfy engines.npm');
  });

  it('fails when package-lock.json drifts from the npm lockfile contract', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'npm@11.7.0',
      engines: {
        npm: '>=10',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 2,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lockfileVersion must stay at 3');
  });
});
