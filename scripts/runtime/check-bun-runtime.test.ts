import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const versionScript = path.join(repoRoot, 'scripts', 'runtime', 'check-bun-version.cjs');
const lockSyncScript = path.join(repoRoot, 'scripts', 'runtime', 'check-bun-lock-sync.cjs');
const expectedBunVersion = fs.readFileSync(path.join(repoRoot, '.bun-version'), 'utf8').trim();

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bun-runtime-checks-'));
  tempRoots.push(root);
  return root;
};

const writeExecutable = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  fs.chmodSync(absolutePath, 0o755);
  return absolutePath;
};

const writeFile = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  return absolutePath;
};

const installFakeBun = (root: string) =>
  writeExecutable(
    root,
    'bin/bun',
    [
      '#!/usr/bin/env node',
      'const fs = require("node:fs");',
      'const path = require("node:path");',
      'const args = process.argv.slice(2);',
      'if (args.length === 1 && args[0] === "--version") {',
      '  process.stdout.write(`${process.env.BUN_FAKE_VERSION ?? "0.0.0"}\\n`);',
      '  process.exit(0);',
      '}',
      'if (args[0] === "pm" && args[1] === "migrate" && args.includes("--force")) {',
      '  if (process.env.BUN_FAKE_MIGRATE_FAIL === "1") {',
      '    process.stderr.write("forced migrate failure\\n");',
      '    process.exit(1);',
      '  }',
      '  const sourcePath = process.env.BUN_FAKE_LOCK_SOURCE;',
      '  if (!sourcePath) {',
      '    process.stderr.write("missing BUN_FAKE_LOCK_SOURCE\\n");',
      '    process.exit(1);',
      '  }',
      '  const lock = fs.readFileSync(sourcePath, "utf8");',
      '  fs.writeFileSync(path.join(process.cwd(), "bun.lock"), lock, "utf8");',
      '  process.stdout.write("migrated lockfile\\n");',
      '  process.exit(0);',
      '}',
      'process.stderr.write(`unexpected bun args: ${args.join(" ")}\\n`);',
      'process.exit(1);',
    ].join('\n')
  );

const runNodeScript = (
  scriptPath: string,
  {
    cwd = repoRoot,
    env = {},
  }: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
) =>
  spawnSync(process.execPath, [scriptPath], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  });

describe('Bun runtime checks', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('passes when bun matches the pinned repo version', () => {
    const root = createTempRoot();
    installFakeBun(root);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'bun-version-check-fixture',
          engines: {
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runNodeScript(versionScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_VERSION: expectedBunVersion,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      `Bun ${expectedBunVersion} matches .bun-version and package.json engines.bun.`
    );
  });

  it('fails when bun does not match the pinned repo version', () => {
    const root = createTempRoot();
    installFakeBun(root);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'bun-version-check-fixture',
          engines: {
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runNodeScript(versionScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_VERSION: '9.9.9',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not match the repo pin');
  });

  it('fails when bun is not available on PATH', () => {
    const root = createTempRoot();
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'bun-version-check-fixture',
          engines: {
            bun: expectedBunVersion,
          },
        },
        null,
        2
      )
    );

    const result = runNodeScript(versionScript, {
      cwd: root,
      env: {
        PATH: '',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bun is not available on PATH');
  });

  it('fails when package.json engines.bun drifts from .bun-version', () => {
    const root = createTempRoot();
    installFakeBun(root);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'bun-version-check-fixture',
          engines: {
            bun: '9.9.9',
          },
        },
        null,
        2
      )
    );

    const result = runNodeScript(versionScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_VERSION: expectedBunVersion,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      `package.json engines.bun="9.9.9" does not match the repo pin ${expectedBunVersion} from .bun-version`
    );
  });

  it('fails when package.json engines.bun is missing', () => {
    const root = createTempRoot();
    installFakeBun(root);
    writeFile(root, '.bun-version', `${expectedBunVersion}\n`);
    writeFile(
      root,
      'package.json',
      JSON.stringify(
        {
          name: 'bun-version-check-fixture',
          engines: {},
        },
        null,
        2
      )
    );

    const result = runNodeScript(versionScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_VERSION: expectedBunVersion,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('package.json must declare engines.bun');
  });

  it('passes when bun.lock matches package-lock.json and keeps the file unchanged', () => {
    const root = createTempRoot();
    installFakeBun(root);

    const lockContents = '{\n  "lockfileVersion": 1\n}\n';
    const lockSource = writeFile(root, 'fixtures/generated-bun.lock', lockContents);
    writeFile(root, 'package.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'package-lock.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'bun.lock', lockContents);
    writeFile(root, 'bunfig.toml', '[install]\nlinker = "hoisted"\n');

    const result = runNodeScript(lockSyncScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_LOCK_SOURCE: lockSource,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('bun.lock matches package-lock.json.');
    expect(fs.readFileSync(path.join(root, 'bun.lock'), 'utf8')).toBe(lockContents);
  });

  it('fails when bun.lock is out of sync and restores the original file contents', () => {
    const root = createTempRoot();
    installFakeBun(root);

    const originalLock = '{\n  "lockfileVersion": 1\n}\n';
    const regeneratedLock = '{\n  "lockfileVersion": 2\n}\n';
    const lockSource = writeFile(root, 'fixtures/generated-bun.lock', regeneratedLock);
    writeFile(root, 'package.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'package-lock.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'bun.lock', originalLock);

    const result = runNodeScript(lockSyncScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_LOCK_SOURCE: lockSource,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('bun.lock is out of sync with package-lock.json');
    expect(fs.readFileSync(path.join(root, 'bun.lock'), 'utf8')).toBe(originalLock);
  });

  it('fails fast when bun.lock is missing', () => {
    const root = createTempRoot();
    installFakeBun(root);

    writeFile(root, 'package.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'package-lock.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');

    const result = runNodeScript(lockSyncScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('bun.lock is missing');
  });

  it('fails when bun pm migrate returns a non-zero exit status', () => {
    const root = createTempRoot();
    installFakeBun(root);

    const originalLock = '{\n  "lockfileVersion": 1\n}\n';
    const lockSource = writeFile(root, 'fixtures/generated-bun.lock', originalLock);
    writeFile(root, 'package.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'package-lock.json', '{\n  "name": "bun-lock-check-fixture"\n}\n');
    writeFile(root, 'bun.lock', originalLock);

    const result = runNodeScript(lockSyncScript, {
      cwd: root,
      env: {
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
        BUN_FAKE_LOCK_SOURCE: lockSource,
        BUN_FAKE_MIGRATE_FAIL: '1',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Bun lock sync check failed while regenerating bun.lock');
    expect(result.stderr).toContain('forced migrate failure');
    expect(fs.readFileSync(path.join(root, 'bun.lock'), 'utf8')).toBe(originalLock);
  });
});
