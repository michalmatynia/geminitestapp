import fs from 'node:fs';
import path from 'node:path';

export const NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE =
  'docs/ai-paths/node-code-objects-v3/rollout-eligibility.json';
export const NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION =
  'ai-paths.node-migration-rollout-eligibility.v2';

type NodeMigrationRolloutEligibilityNode = {
  nodeType?: unknown;
  stage?: unknown;
  score?: unknown;
  eligible?: unknown;
  blockers?: unknown;
  parityEvidenceSuiteIds?: unknown;
};

type NodeMigrationRolloutEligibilityPayload = {
  schemaVersion?: unknown;
  generatedAt?: unknown;
  criteria?: unknown;
  eligibleNodeTypes?: unknown;
  nodes?: unknown;
};

const toSafeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const uniqueSorted = (values: string[]): string[] =>
  Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return uniqueSorted(value.map((entry: unknown): string => toSafeString(entry)).filter(Boolean));
};

export type NodeMigrationRolloutEligibilitySummary = {
  sourceFile: string;
  sourcePath: string;
  schemaVersion: string | null;
  generatedAt: string | null;
  criteria: string[];
  eligibleNodeTypes: string[];
  nodes: Array<{
    nodeType: string;
    stage: string | null;
    score: number | null;
    eligible: boolean;
    blockers: string[];
    parityEvidenceSuiteIds: string[];
  }>;
};

export const loadNodeMigrationRolloutEligibilitySummary = ({
  workspaceRoot,
}: {
  workspaceRoot: string;
}): NodeMigrationRolloutEligibilitySummary => {
  const sourcePath = path.join(workspaceRoot, NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE);
  if (!fs.existsSync(sourcePath)) {
    return {
      sourceFile: NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE,
      sourcePath,
      schemaVersion: null,
      generatedAt: null,
      criteria: [],
      eligibleNodeTypes: [],
      nodes: [],
    };
  }

  let rawPayload: NodeMigrationRolloutEligibilityPayload;
  try {
    rawPayload = JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as NodeMigrationRolloutEligibilityPayload;
  } catch {
    return {
      sourceFile: NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE,
      sourcePath,
      schemaVersion: null,
      generatedAt: null,
      criteria: [],
      eligibleNodeTypes: [],
      nodes: [],
    };
  }

  const nodesRaw = Array.isArray(rawPayload.nodes) ? rawPayload.nodes : [];
  const nodes = nodesRaw
    .map((entry: unknown) => {
      const row = entry as NodeMigrationRolloutEligibilityNode | null;
      const nodeType = toSafeString(row?.nodeType);
      if (!nodeType) return null;
      const stage = toSafeString(row?.stage) || null;
      const score =
        typeof row?.score === 'number' && Number.isFinite(row.score) ? Math.trunc(row.score) : null;
      const eligible = row?.eligible === true;
      return {
        nodeType,
        stage,
        score,
        eligible,
        blockers: normalizeStringArray(row?.blockers),
        parityEvidenceSuiteIds: normalizeStringArray(row?.parityEvidenceSuiteIds),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((left, right) => left.nodeType.localeCompare(right.nodeType));

  return {
    sourceFile: NODE_MIGRATION_ROLLOUT_ELIGIBILITY_FILE,
    sourcePath,
    schemaVersion: toSafeString(rawPayload.schemaVersion) || null,
    generatedAt: toSafeString(rawPayload.generatedAt) || null,
    criteria: normalizeStringArray(rawPayload.criteria),
    eligibleNodeTypes: uniqueSorted(
      normalizeStringArray(rawPayload.eligibleNodeTypes).concat(
        nodes.filter((entry) => entry.eligible).map((entry) => entry.nodeType)
      )
    ),
    nodes,
  };
};
