import fs from 'node:fs';
import path from 'node:path';

export const NODE_MIGRATION_PARITY_EVIDENCE_SCHEMA_VERSION =
  'ai-paths.node-migration-parity-evidence.v1' as const;

export const NODE_MIGRATION_PARITY_EVIDENCE_FILE =
  'docs/ai-paths/node-code-objects-v3/parity-evidence.json' as const;

type NodeMigrationParityEvidenceSuite = {
  suiteId?: string;
  testFile?: string;
  modes?: unknown;
  nodeTypes?: unknown;
  notes?: string;
};

type NodeMigrationParityEvidencePayload = {
  schemaVersion?: string;
  generatedAt?: string;
  suites?: NodeMigrationParityEvidenceSuite[];
};

export type NodeMigrationParityEvidenceSummary = {
  sourceFile: string;
  sourcePath: string;
  schemaVersion: string | null;
  generatedAt: string | null;
  suiteCount: number;
  suiteIds: string[];
  validatedNodeTypes: string[];
  suiteIdsByNodeType: Record<string, string[]>;
};

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry: unknown): string => toSafeString(entry))
        .filter((entry: string): boolean => entry.length > 0)
    )
  ).sort((left: string, right: string): number => left.localeCompare(right));
};

const readParityEvidencePayload = (sourcePath: string): NodeMigrationParityEvidencePayload => {
  if (!fs.existsSync(sourcePath)) {
    return {
      suites: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(sourcePath, 'utf8')) as NodeMigrationParityEvidencePayload;
  } catch {
    return {
      suites: [],
    };
  }
};

export const loadNodeMigrationParityEvidenceSummary = ({
  workspaceRoot,
}: {
  workspaceRoot: string;
}): NodeMigrationParityEvidenceSummary => {
  const sourceFile = NODE_MIGRATION_PARITY_EVIDENCE_FILE;
  const sourcePath = path.join(workspaceRoot, sourceFile);
  const payload = readParityEvidencePayload(sourcePath);

  const rawSuiteIdsByNodeType = new Map<string, Set<string>>();
  const suiteIds = new Set<string>();

  const suites = Array.isArray(payload.suites) ? payload.suites : [];
  for (const suite of suites) {
    const suiteId = toSafeString(suite?.suiteId);
    if (!suiteId) continue;
    suiteIds.add(suiteId);
    const nodeTypes = normalizeStringArray(suite?.nodeTypes);
    for (const nodeType of nodeTypes) {
      const setForNodeType = rawSuiteIdsByNodeType.get(nodeType) ?? new Set<string>();
      setForNodeType.add(suiteId);
      rawSuiteIdsByNodeType.set(nodeType, setForNodeType);
    }
  }

  const suiteIdsByNodeType = Object.fromEntries(
    Array.from(rawSuiteIdsByNodeType.entries())
      .map(([nodeType, ids]: [string, Set<string>]): [string, string[]] => [
        nodeType,
        Array.from(ids).sort((left: string, right: string): number => left.localeCompare(right)),
      ])
      .sort(([left], [right]) => left.localeCompare(right))
  ) as Record<string, string[]>;

  const validatedNodeTypes = Object.keys(suiteIdsByNodeType).sort((left, right) =>
    left.localeCompare(right)
  );

  const schemaVersion = toSafeString(payload.schemaVersion) || null;
  const generatedAt = toSafeString(payload.generatedAt) || null;

  return {
    sourceFile,
    sourcePath,
    schemaVersion,
    generatedAt,
    suiteCount: suites.filter((suite) => toSafeString(suite?.suiteId).length > 0).length,
    suiteIds: Array.from(suiteIds).sort((left, right) => left.localeCompare(right)),
    validatedNodeTypes,
    suiteIdsByNodeType,
  };
};
