import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE,
  NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION,
  loadNodeMigrationRolloutEligibilitySummary,
} from '../../../scripts/docs/node-migration-rollout-eligibility';

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const expectedPilotNodeTypes = new Set<string>(
  NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: unknown): string =>
    normalizeNodeType(entry)
  ).filter((entry: string): boolean => entry.length > 0)
);

describe('node migration rollout eligibility', () => {
  it('keeps schema/version metadata valid for migration checks', () => {
    const summary = loadNodeMigrationRolloutEligibilitySummary({
      workspaceRoot: process.cwd(),
    });

    expect(summary.sourceFile).toBe(NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE);
    expect(path.isAbsolute(summary.sourcePath)).toBe(true);
    expect(summary.schemaVersion).toBe(NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION);
    expect(summary.generatedAt).toBeTruthy();
    expect(summary.criteria.length).toBeGreaterThan(0);
  });

  it('only marks v3 pilot rollout candidates as technically eligible', () => {
    const summary = loadNodeMigrationRolloutEligibilitySummary({
      workspaceRoot: process.cwd(),
    });

    summary.eligibleNodeTypes.forEach((nodeType: string): void => {
      expect(
        expectedPilotNodeTypes.has(nodeType),
        `Rollout eligibility node "${nodeType}" is not in NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`
      ).toBe(true);
    });

    const eligibleRows = summary.nodes.filter((row) => row.eligible);
    expect(eligibleRows.length).toBe(summary.eligibleNodeTypes.length);
    eligibleRows.forEach((row) => {
      expect(summary.eligibleNodeTypes).toContain(row.nodeType);
      expect(['rollout_candidate', 'rollout_approved']).toContain(row.stage);
      expect(row.parityEvidenceSuiteIds.length).toBeGreaterThan(0);
    });
  });
});
