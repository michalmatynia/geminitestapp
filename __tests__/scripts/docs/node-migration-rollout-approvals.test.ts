import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  NODE_MIGRATION_ROLLOUT_APPROVALS_FILE,
  NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION,
  loadNodeMigrationRolloutApprovalsSummary,
} from '../../../scripts/docs/node-migration-rollout-approvals';

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const expectedPilotNodeTypes = new Set<string>(
  NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: unknown): string =>
    normalizeNodeType(entry)
  ).filter((entry: string): boolean => entry.length > 0)
);

describe('node migration rollout approvals', () => {
  it('keeps schema/version metadata valid for migration checks', () => {
    const summary = loadNodeMigrationRolloutApprovalsSummary({
      workspaceRoot: process.cwd(),
    });

    expect(summary.sourceFile).toBe(NODE_MIGRATION_ROLLOUT_APPROVALS_FILE);
    expect(path.isAbsolute(summary.sourcePath)).toBe(true);
    expect(summary.schemaVersion).toBe(NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION);
  });

  it('allows approvals only for v3 pilot node types', () => {
    const summary = loadNodeMigrationRolloutApprovalsSummary({
      workspaceRoot: process.cwd(),
    });

    summary.approvedNodeTypes.forEach((nodeType: string): void => {
      expect(
        expectedPilotNodeTypes.has(nodeType),
        `Rollout approval node "${nodeType}" is not in NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`
      ).toBe(true);
    });
  });
});
