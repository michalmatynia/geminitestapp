import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeTestDistribution } from './lib/check-test-distribution.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'test-distribution-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeTestDistribution', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('tracks feature coverage, fast-test gaps, and negative-path signals', () => {
    const root = createTempRoot();
    writeSource(root, 'src/features/products/index.ts', 'export const products = true;\n');
    writeSource(root, 'src/features/auth/index.ts', 'export const auth = true;\n');
    writeSource(root, 'src/features/notes/index.ts', 'export const notes = true;\n');
    writeSource(root, 'src/features/payments/index.ts', 'export const payments = true;\n');
    writeSource(
      root,
      'src/features/products/products.test.ts',
      [
        'describe.only(\'products\', () => {',
        '  it.skip(\'covers products\', () => {',
        '    expect(true).toBe(true);',
        '  });',
        '  await expect(Promise.reject(new Error(\'invalid\'))).rejects.toThrow(\'invalid\');',
        '  test.todo(\'covers invalid product payloads\');',
        '});',
        '',
      ].join('\n')
    );
    writeSource(root, 'e2e/features/auth/auth.spec.ts', 'test(\'auth\', async () => {});\n');
    writeSource(root, 'src/features/notes/notes.test.ts', 'it(\'notes\', () => expect(true).toBe(true));\n');

    const report = analyzeTestDistribution({ root });

    expect(report.summary.featureCount).toBe(4);
    expect(report.summary.featuresWithTestCount).toBe(3);
    expect(report.summary.featuresWithoutTestCount).toBe(1);
    expect(report.summary.featuresWithoutFastTestCount).toBe(1);
    expect(report.summary.featuresWithoutNegativeTestCount).toBe(2);
    expect(report.summary.onlyCount).toBe(1);
    expect(report.summary.skipCount).toBe(1);
    expect(report.summary.todoCount).toBe(1);
    expect(report.featuresWithoutTests).toContain('payments');
    expect(report.featuresWithoutFastTests).toContain('auth');
    expect(report.featuresWithoutNegativeTests).toEqual(expect.arrayContaining(['auth', 'notes']));
    expect(report.featuresWithTests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          feature: 'products',
          testCount: 1,
          fastTestCount: 1,
          e2eTestCount: 0,
          negativePathTestCount: 1,
        }),
        expect.objectContaining({
          feature: 'auth',
          testCount: 1,
          fastTestCount: 0,
          e2eTestCount: 1,
          negativePathTestCount: 0,
        }),
      ])
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'test-only-left' }),
        expect.objectContaining({ ruleId: 'test-skip-left' }),
        expect.objectContaining({ ruleId: 'test-todo-left' }),
        expect.objectContaining({ ruleId: 'feature-no-fast-tests' }),
        expect.objectContaining({ ruleId: 'feature-no-negative-tests' }),
        expect.objectContaining({
          ruleId: 'feature-no-tests',
          message: expect.stringContaining('payments'),
        }),
      ])
    );
  });
});
