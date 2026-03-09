import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { analyzeImportBoundaries } from './lib/check-import-boundaries.mjs';

const tempRoots: string[] = [];

const createTempRoot = (): string => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'import-boundaries-'));
  tempRoots.push(root);
  return root;
};

const writeSource = (root: string, relativeFile: string, contents: string): void => {
  const filePath = path.join(root, relativeFile);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
};

describe('analyzeImportBoundaries', () => {
  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop();
      if (root) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('flags deep relative imports, cross-feature internals, and prisma usage outside server code', () => {
    const root = createTempRoot();
    writeSource(root, 'src/features/products/internal/state.ts', 'export const state = {};\n');
    writeSource(
      root,
      'src/features/orders/ui/OrderPanel.ts',
      [
        "import { PrismaClient } from '@prisma/client';",
        "import { state } from '@/features/products/internal/state';",
        "import helper from '../../../../shared/lib/helper';",
        'void PrismaClient;',
        'void state;',
        'void helper;',
        '',
      ].join('\n')
    );

    const report = analyzeImportBoundaries({ root });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'prisma-outside-server',
          file: 'src/features/orders/ui/OrderPanel.ts',
        }),
        expect.objectContaining({
          ruleId: 'cross-feature-internal-import',
          file: 'src/features/orders/ui/OrderPanel.ts',
        }),
        expect.objectContaining({
          ruleId: 'deep-relative-import',
          file: 'src/features/orders/ui/OrderPanel.ts',
        }),
      ])
    );
  });

  it('detects circular feature dependencies', () => {
    const root = createTempRoot();
    writeSource(
      root,
      'src/features/orders/index.ts',
      "import '@/features/products/index';\nexport const orders = true;\n"
    );
    writeSource(
      root,
      'src/features/products/index.ts',
      "import '@/features/orders/index';\nexport const products = true;\n"
    );

    const report = analyzeImportBoundaries({ root });

    expect(report.summary.circularDependencyCount).toBe(1);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: 'circular-feature-dep',
          message: expect.stringContaining('orders'),
        }),
      ])
    );
  });
});
