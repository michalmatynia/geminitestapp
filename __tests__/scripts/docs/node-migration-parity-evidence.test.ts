import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  NODE_MIGRATION_PARITY_EVIDENCE_FILE,
  NODE_MIGRATION_PARITY_EVIDENCE_SCHEMA_VERSION,
  loadNodeMigrationParityEvidenceSummary,
} from '../../../scripts/docs/node-migration-parity-evidence';

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const expectedPilotNodeTypes = Array.from(
  new Set(
    NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: unknown): string =>
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
  });

  it('requires every v3 pilot node type to be covered by at least one parity suite', () => {
    const summary = loadNodeMigrationParityEvidenceSummary({
      workspaceRoot: process.cwd(),
    });

    expectedPilotNodeTypes.forEach((nodeType: string): void => {
      const suiteIds = summary.suiteIdsByNodeType[nodeType] ?? [];
      expect(
        suiteIds.length,
        `Pilot node "${nodeType}" is missing parity evidence coverage in ${summary.sourceFile}`
      ).toBeGreaterThan(0);
    });
  });
});
