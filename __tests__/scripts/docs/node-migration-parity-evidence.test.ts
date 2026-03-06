import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  NODE_MIGRATION_PARITY_EVIDENCE_FILE,
  NODE_MIGRATION_PARITY_EVIDENCE_SCHEMA_VERSION,
  loadNodeMigrationParityEvidenceSummary,
} from '../../../scripts/docs/node-migration-parity-evidence';

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const expectedRuntimeKernelNodeTypes = Array.from(
  new Set(
    NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES.map((entry: unknown): string =>
      normalizeNodeType(entry)
    ).filter((entry: string): boolean => entry.length > 0)
  )
).sort((left: string, right: string): number => left.localeCompare(right));

describe('node migration parity evidence', () => {
  it('keeps schema/version metadata valid for migration checks', () => {
    const summary = loadNodeMigrationParityEvidenceSummary({
      workspaceRoot: process.cwd(),
    });

    expect(summary.sourceFile).toBe(NODE_MIGRATION_PARITY_EVIDENCE_FILE);
    expect(path.isAbsolute(summary.sourcePath)).toBe(true);
    expect(summary.schemaVersion).toBe(NODE_MIGRATION_PARITY_EVIDENCE_SCHEMA_VERSION);
    expect(summary.generatedAt).toBeTruthy();
    expect(summary.suiteCount).toBeGreaterThan(0);
    expect(summary.suiteIds.length).toBe(summary.suiteCount);
    summary.suites.forEach((suite) => {
      expect(suite.testFile, `${suite.suiteId} must define a testFile`).toBeTruthy();
      const suiteTestPath = path.join(process.cwd(), suite.testFile);
      expect(
        fs.existsSync(suiteTestPath),
        `${suite.suiteId} references missing test file ${suite.testFile}`
      ).toBe(true);
    });
  });

  it('requires every canonical runtime-kernel node type to be covered by at least one parity suite', () => {
    const summary = loadNodeMigrationParityEvidenceSummary({
      workspaceRoot: process.cwd(),
    });

    expectedRuntimeKernelNodeTypes.forEach((nodeType: string): void => {
      const suiteIds = summary.suiteIdsByNodeType[nodeType] ?? [];
      expect(
        suiteIds.length,
        `Runtime-kernel node "${nodeType}" is missing parity evidence coverage in ${summary.sourceFile}`
      ).toBeGreaterThan(0);
    });
  });

  it('keeps product trigger queue E2E parity evidence pinned for trigger-node runtime integration', () => {
    const summary = loadNodeMigrationParityEvidenceSummary({
      workspaceRoot: process.cwd(),
    });

    const suite = summary.suites.find(
      (entry) => entry.suiteId === 'v3-pilot-product-trigger-queue-e2e'
    );
    expect(suite).toBeTruthy();
    expect(suite?.testFile).toBe('e2e/features/products/products-trigger-queue-integration.spec.ts');
    expect(suite?.modes).toContain('code_object_v3');
    expect(suite?.nodeTypes).toContain('trigger');
  });
});
