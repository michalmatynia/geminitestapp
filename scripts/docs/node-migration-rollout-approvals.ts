import fs from 'node:fs';
import path from 'node:path';

export const NODE_MIGRATION_ROLLOUT_APPROVALS_FILE =
  'docs/ai-paths/node-code-objects-v3/rollout-approvals.json';
export const NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION =
  'ai-paths.node-migration-rollout-approvals.v1';

type NodeMigrationRolloutApprovalsPayload = {
  schemaVersion?: unknown;
  generatedAt?: unknown;
  approvedNodeTypes?: unknown;
};

const normalizeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));

export type NodeMigrationRolloutApprovalsSummary = {
  sourceFile: string;
  sourcePath: string;
  schemaVersion: string | null;
  generatedAt: string | null;
  approvedNodeTypes: string[];
};

export const loadNodeMigrationRolloutApprovalsSummary = ({
  workspaceRoot,
}: {
  workspaceRoot: string;
}): NodeMigrationRolloutApprovalsSummary => {
  const sourcePath = path.join(workspaceRoot, NODE_MIGRATION_ROLLOUT_APPROVALS_FILE);
  if (!fs.existsSync(sourcePath)) {
    return {
      sourceFile: NODE_MIGRATION_ROLLOUT_APPROVALS_FILE,
      sourcePath,
      schemaVersion: null,
      generatedAt: null,
      approvedNodeTypes: [],
    };
  }

  let rawPayload: NodeMigrationRolloutApprovalsPayload;
  try {
    rawPayload = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as NodeMigrationRolloutApprovalsPayload;
  } catch {
    return {
      sourceFile: NODE_MIGRATION_ROLLOUT_APPROVALS_FILE,
      sourcePath,
      schemaVersion: null,
      generatedAt: null,
      approvedNodeTypes: [],
    };
  }

  const schemaVersion = normalizeNodeType(rawPayload.schemaVersion) || null;
  const generatedAt = normalizeNodeType(rawPayload.generatedAt) || null;
  const approvedNodeTypesRaw = Array.isArray(rawPayload.approvedNodeTypes)
    ? rawPayload.approvedNodeTypes
    : [];
  const approvedNodeTypes = uniqueSorted(
    approvedNodeTypesRaw
      .map((entry: unknown): string => normalizeNodeType(entry))
      .filter((entry: string): boolean => entry.length > 0)
  );

  return {
    sourceFile: NODE_MIGRATION_ROLLOUT_APPROVALS_FILE,
    sourcePath,
    schemaVersion,
    generatedAt,
    approvedNodeTypes,
  };
};
