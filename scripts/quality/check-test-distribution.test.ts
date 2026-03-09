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

  it('tracks feature coverage and flags lingering .only()/.skip()', () => {
    const root = createTempRoot();
    writeSource(root, 'src/features/products/index.ts', 'export const products = true;\n');
    writeSource(root, 'src/features/auth/index.ts', 'export const auth = true;\n');
    writeSource(
      root,
      'src/features/products/products.test.ts',
      [
        'describe.only(\'products\', () => {',
        '  it.skip(\'covers products\', () => {',
        '    expect(true).toBe(true);',
        '  });',
        '});',
        '',
      ].join('\n')
    );

    const report = analyzeTestDistribution({ root });

    expect(report.summary.featureCount).toBe(2);
    expect(report.summary.featuresWithTestCount).toBe(1);
    expect(report.summary.featuresWithoutTestCount).toBe(1);
    expect(report.summary.onlyCount).toBe(1);
    expect(report.summary.skipCount).toBe(1);
    expect(report.featuresWithoutTests).toContain('auth');
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: 'test-only-left' }),
        expect.objectContaining({ ruleId: 'test-skip-left' }),
        expect.objectContaining({
          ruleId: 'feature-no-tests',
          message: expect.stringContaining('auth'),
        }),
      ])
    );
  });
});
