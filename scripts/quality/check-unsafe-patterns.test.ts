import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeUnsafePatterns } from './lib/check-unsafe-patterns.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unsafe-patterns-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeUnsafePatterns', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags unsafe assertions, bare suppressions, and disabled eslint rules', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/demo.ts',
      [
        '// @ts-ignore',
        'const value = data as unknown as string;',
        'const anything: any = value;',
        '// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any',
        'anything!.trim();',
        '',
      ].join('\n')
    );

    const report = analyzeUnsafePatterns({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'double-assertion' }),
        expect.objectContaining({ ruleId: 'ts-ignore-no-reason' }),
        expect.objectContaining({ ruleId: 'explicit-any' }),
        expect.objectContaining({ ruleId: 'eslint-disable' }),
        expect.objectContaining({ ruleId: 'non-null-assertion' }),
      ])
    );
    expect(report.trendCounters.doubleAssertionCount).toBe(1);
    expect(report.trendCounters.anyCount).toBe(1);
    expect(report.trendCounters.eslintDisableCount).toBe(1);
    expect(report.eslintDisabledRules['no-console']).toBe(1);
  });

  it('ignores test files by default and strips comments before scanning', () => {
    const root = createTempRoot();
    writeSource(root, 'src/example.test.ts', 'const value = data as unknown as string;\n');
    writeSource(root, 'src/comments.ts', '// const maybe = other as unknown as string;\n');

    const report = analyzeUnsafePatterns({ root });

    expect(report.summary.errorCount).toBe(0);
    expect(report.summary.warningCount).toBe(0);
    expect(report.summary.infoCount).toBe(0);
  });
});
