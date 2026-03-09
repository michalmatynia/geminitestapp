import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const tempRoots: string[] = [];
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const lintDomainScript = path.join(repoRoot, 'scripts', 'quality', 'run-lint-domain-checks.mjs');

const createTempRoot = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-domain-checks-'));
  tempRoots.push(root);
  return root;
};

const ensureDir = (root: string, relativePath: string) => {
  fs.mkdirSync(path.join(root, relativePath), { recursive: true });
};

const writeExecutable = (root: string, relativePath: string, contents: string) => {
  const absolutePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, contents, 'utf8');
  fs.chmodSync(absolutePath, 0o755);
  return absolutePath;
};

describe('run-lint-domain-checks summary-json mode', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) {
        fs.rmSync(root, { recursive: true, force: true });
      }
    }
  });

  it('returns a structured envelope without writing artifacts', () => {
    const root = createTempRoot();
    ensureDir(root, 'src/features/auth');
    ensureDir(root, 'src/features/products');

    writeExecutable(
      root,
      'bin/npx',
      [
        '#!/usr/bin/env node',
        'const args = process.argv.slice(2);',
        'if (args.includes(\'src/features/products\')) {',
        '  process.stderr.write(\'products lint failed\\n\');',
        '  process.exit(1);',
        '}',
        'process.stdout.write(`lint ok for ${args.join(\' \')}\\n`);',
      ].join('\n')
    );

    const result = spawnSync(process.execPath, [lintDomainScript, '--summary-json', '--no-write'], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${path.join(root, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`,
      },
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.scanner.name).toBe('lint-domain-checks');
    expect(payload.summary).toMatchObject({
      totalDomains: 5,
      passedDomains: 1,
      failedDomains: 1,
      skippedDomains: 3,
    });
    expect(payload.details.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'auth',
          status: 'pass',
          resolvedTargets: ['src/features/auth'],
        }),
        expect.objectContaining({
          id: 'products',
          status: 'fail',
          resolvedTargets: ['src/features/products'],
          output: expect.stringContaining('products lint failed'),
        }),
        expect.objectContaining({
          id: 'ai-paths',
          status: 'skipped',
        }),
      ])
    );
    expect(payload.paths).toBeNull();
    expect(fs.existsSync(path.join(root, 'docs/metrics/lint-domain-checks-latest.json'))).toBe(false);
  });
});
