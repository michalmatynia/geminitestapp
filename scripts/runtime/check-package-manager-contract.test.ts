import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-package-manager-contract.cjs');
const repoPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  engines?: Record<string, string>;
  packageManager?: string;
};
const expectedBunVersion = fs.readFileSync(path.join(repoRoot, '.bun-version'), 'utf8').trim();
const expectedPackageManager = repoPackageJson.packageManager;
const expectedNpmEngine = repoPackageJson.engines?.npm;

if (typeof expectedPackageManager !== 'string' || expectedPackageManager.trim().length === 0) {
  throw new Error('package.json must declare packageManager for the package manager contract test.');
}

if (typeof expectedNpmEngine !== 'string' || expectedNpmEngine.trim().length === 0) {
  throw new Error('package.json must declare engines.npm for the package manager contract test.');
}

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
      packageManager: expectedPackageManager,
      engines: {
        npm: expectedNpmEngine,
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

  it('passes when packageManager and engines.npm contain surrounding whitespace', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: `  ${expectedPackageManager}  `,
      engines: {
        npm: `  ${expectedNpmEngine}  `,
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
        npm: expectedNpmEngine,
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

  it('fails when packageManager is empty', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: '   ',
      engines: {
        npm: expectedNpmEngine,
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
      packageManager: `bun@${expectedBunVersion}`,
      engines: {
        npm: expectedNpmEngine,
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

  it('fails when packageManager is not pinned to a full semver version', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'npm@11',
      engines: {
        npm: expectedNpmEngine,
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('packageManager must use the form');
  });

  it('fails when engines.npm is missing', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {},
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.npm');
  });

  it('fails when engines.npm is empty', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: '   ',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.npm');
  });

  it('fails when packageManager does not satisfy engines.npm', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: 'npm@0.0.0',
      engines: {
        npm: expectedNpmEngine,
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

  it('fails when engines.npm cannot be evaluated', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: 'workspace:*',
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to evaluate package.json engines.npm');
    expect(result.stderr).toContain('Unsupported npm engine comparator');
  });

  it('fails when package-lock.json drifts from the npm lockfile contract', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: expectedNpmEngine,
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

  it('fails when package-lock.json is missing lockfileVersion', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: expectedNpmEngine,
      },
    });
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('lockfileVersion must stay at 3');
    expect(result.stderr).toContain('Received "missing"');
  });

  it('fails when package.json cannot be parsed', () => {
    const root = createTempRoot();
    writeFile(root, 'package.json', '{\n');
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to read package.json');
  });

  it('fails when package.json is missing', () => {
    const root = createTempRoot();
    writeJson(root, 'package-lock.json', {
      name: 'package-manager-contract-fixture',
      lockfileVersion: 3,
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to read package.json');
  });

  it('fails when package-lock.json cannot be parsed', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: expectedNpmEngine,
      },
    });
    writeFile(root, 'package-lock.json', '{\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to read package-lock.json');
  });

  it('fails when package-lock.json is missing', () => {
    const root = createTempRoot();
    writeJson(root, 'package.json', {
      name: 'package-manager-contract-fixture',
      packageManager: expectedPackageManager,
      engines: {
        npm: expectedNpmEngine,
      },
    });

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to read package-lock.json');
  });
});
