import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'runtime', 'check-node-toolchain-sync.cjs');
const repoPackageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')) as {
  engines?: Record<string, string>;
};
const expectedNodeVersion = fs.readFileSync(path.join(repoRoot, '.nvmrc'), 'utf8').trim();
const expectedBunVersion = fs.readFileSync(path.join(repoRoot, '.bun-version'), 'utf8').trim();
const expectedNodeEngine = repoPackageJson.engines?.node;
const mismatchedNodeVersion = String(Number.parseInt(expectedNodeVersion, 10) + 1);
const mismatchedBunVersion = expectedBunVersion === '1.3.9' ? '1.3.8' : '1.3.9';

if (typeof expectedNodeEngine !== 'string' || expectedNodeEngine.trim().length === 0) {
  throw new Error('package.json must declare engines.node for the node toolchain sync test.');
}

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
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
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

  it('passes when Node major pins use a leading v prefix', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `v${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `v${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs v${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
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

  it('passes when .tool-versions contains comments, blank lines, and extra tools', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      '.tool-versions',
      [
        '# shared toolchain pins',
        '',
        `nodejs   ${expectedNodeVersion}`,
        `bun    ${expectedBunVersion}`,
        'python 3.12.9',
        '',
      ].join('\n')
    );
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
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

  it('fails when .nvmrc is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .nvmrc');
  });

  it('fails when .node-version is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .node-version');
  });

  it('fails when .bun-version is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .bun-version');
  });

  it('fails when .tool-versions is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Missing required .tool-versions');
  });

  it('fails when .node-version drifts from .nvmrc', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${mismatchedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
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

  it('fails when .nvmrc does not contain a single Node major version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', '22.1.0\n');
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.nvmrc must contain a single Node major version');
  });

  it('fails when .node-version does not contain a single Node major version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', '22.1.0\n');
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.node-version must contain a single Node major version');
  });

  it('fails when package.json engines.node excludes the pinned major', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: `>=20.9 <${expectedNodeVersion}`,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`does not include the pinned Node major ${expectedNodeVersion}`);
  });

  it('fails when package.json engines.node cannot be evaluated', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: 'workspace:*',
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Unable to evaluate package.json engines.node');
    expect(result.stderr).toContain('Unsupported node engine comparator');
  });

  it('fails when package.json engines.node is empty', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: '   ',
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.node');
  });

  it('fails when package.json engines.node is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.node');
  });

  it('fails when package.json is not valid JSON', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(root, 'package.json', '{\n');

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json is not valid JSON');
  });

  it('fails when .tool-versions nodejs drifts from .nvmrc', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${mismatchedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `.tool-versions nodejs entry (${mismatchedNodeVersion}) does not match the pinned Node major ${expectedNodeVersion}`
    );
  });

  it('fails when the .tool-versions nodejs entry is not a single Node major', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs 22.1.0\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.tool-versions nodejs entry must contain a single Node major version');
  });

  it('fails when .tool-versions is missing the nodejs entry', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `bun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.tool-versions must declare a nodejs entry');
  });

  it('fails when .tool-versions bun drifts from .bun-version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${mismatchedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `.tool-versions bun entry (${mismatchedBunVersion}) does not match .bun-version (${expectedBunVersion})`
    );
  });

  it('fails when .tool-versions is missing the bun entry', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('.tool-versions must declare a bun entry');
  });

  it('fails when package.json engines.bun drifts from .bun-version', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: mismatchedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runScript(root);

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `package.json engines.bun="${mismatchedBunVersion}" does not match .bun-version (${expectedBunVersion})`
    );
  });

  it('fails when package.json engines.bun is missing', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
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

  it('fails when package.json engines.bun is empty', () => {
    const root = createTempRoot();
    writeFile(root, '.nvmrc', `${expectedNodeVersion}\n`);
    writeFile(root, '.node-version', `${expectedNodeVersion}\n`);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(root, '.tool-versions', `nodejs ${expectedNodeVersion}\nbun ${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'node-toolchain-sync-fixture',
          engines: {
            node: expectedNodeEngine,
            bun: '   ',
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
