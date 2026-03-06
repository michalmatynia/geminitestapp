import fs from 'node:fs';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import { loadNodeMigrationParityEvidenceSummary } from './node-migration-parity-evidence';
import {
  NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION,
  loadNodeMigrationRolloutApprovalsSummary,
} from './node-migration-rollout-approvals';
import {
  NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION,
  loadNodeMigrationRolloutEligibilitySummary,
} from './node-migration-rollout-eligibility';
import {
  type NodeMigrationReadiness,
  type NodeMigrationReadinessBlockerCode,
  type NodeMigrationReadinessStage,
  NODE_MIGRATION_READINESS_BLOCKER_CODES,
  NODE_MIGRATION_READINESS_STAGES,
  computeNodeMigrationReadiness,
  summarizeNodeMigrationReadiness,
} from './node-migration-readiness';

type NodeMigrationIndexRow = {
  nodeType: string;
  title: string;
  nodeFamily: string;
  runtimeStrategy: 'legacy_adapter' | 'code_object_v3';
  migrationWave: 'pilot' | 'backlog';
  codeObjectId: string | null;
  ports: {
    inputs: string[];
    outputs: string[];
  };
  configFieldCount: number;
  docs: {
    semanticNodeFile: string;
    semanticNodeHash: string | null;
    v2ObjectFile: string;
    v3ScaffoldFile: string | null;
    v3ObjectId: string | null;
    v3ObjectHash: string | null;
    migrationDocFile: string;
  };
  migrationChecklistTemplate: {
    semanticContractReviewed: boolean;
    v3CodeObjectAuthored: boolean;
    dualRunParityValidated: boolean;
    rolloutApproved: boolean;
  };
  parityEvidenceSuiteIds: string[];
  migrationReadiness: NodeMigrationReadiness;
};

type NodeMigrationIndexPayload = {
  schemaVersion: string;
  generatedAt: string;
  totalNodes: number;
  runtimeKernelNodeTypes?: string[];
  pilotNodeTypes?: string[];
  strategyTotals: {
    legacy_adapter: number;
    code_object_v3: number;
  };
  v3ContractsHash?: string | null;
  readiness: {
    averageScore: number;
    totalsByStage: Record<NodeMigrationReadinessStage, number>;
    topBlockers: Array<{
      code: NodeMigrationReadinessBlockerCode;
      count: number;
    }>;
  };
  parityEvidence?: {
    sourceFile?: string;
    schemaVersion?: string | null;
    generatedAt?: string | null;
    suiteCount?: number;
    suiteIds?: string[];
    validatedNodeTypes?: string[];
  };
  rolloutApprovals?: {
    sourceFile?: string;
    schemaVersion?: string | null;
    generatedAt?: string | null;
    approvedNodeTypes?: string[];
    approvedCount?: number;
  };
  rolloutEligibility?: {
    sourceFile?: string;
    schemaVersion?: string;
    generatedAt?: string;
    criteria?: string[];
    eligibleNodeTypes?: string[];
    eligibleCount?: number;
  };
  familyTotals: Array<{
    nodeFamily: string;
    total: number;
    legacy_adapter: number;
    code_object_v3: number;
  }>;
  nodes: NodeMigrationIndexRow[];
};

type SemanticNodeIndexRow = {
  nodeType?: string;
  nodeHash?: string;
};

type NodeCodeObjectV3Index = {
  objects?: Array<{
    id?: string;
    nodeType?: string;
    objectFile?: string;
    objectHash?: string;
    codeObjectId?: string;
  }>;
};

type NodeCodeObjectV3Contracts = {
  contractsHash?: string;
};

const workspaceRoot = process.cwd();
const outputDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v3');
const indexPath = path.join(outputDir, 'migration-index.json');
const guidePath = path.join(outputDir, 'MIGRATION_GUIDE.md');
const perNodeDocsDir = path.join(outputDir, 'nodes');
const semanticNodeIndexPath = path.join(workspaceRoot, 'docs/ai-paths/semantic-grammar/nodes/index.json');
const v3IndexPath = path.join(outputDir, 'index.json');
const v3ContractsPath = path.join(outputDir, 'contracts.json');

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const readDeclaredRuntimeKernelNodeTypes = (payload: NodeMigrationIndexPayload): string[] =>
  (
    Array.isArray(payload.runtimeKernelNodeTypes)
      ? payload.runtimeKernelNodeTypes
      : payload.pilotNodeTypes ?? []
  )
    .map(toSafeString)
    .filter(Boolean);

const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

const expectedNodeTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));
const expectedNodeDocsByType = new Map<string, (typeof AI_PATHS_NODE_DOCS)[number]>(
  AI_PATHS_NODE_DOCS.map((doc) => [doc.type, doc])
);
const runtimeKernelNodeTypeSet = new Set<string>(
  NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES.map((entry: string): string =>
    typeof entry === 'string' ? entry.trim() : ''
  ).filter(Boolean)
);
const parityEvidenceSummary = loadNodeMigrationParityEvidenceSummary({ workspaceRoot });
const rolloutApprovalsSummary = loadNodeMigrationRolloutApprovalsSummary({ workspaceRoot });
const rolloutEligibilitySummary = loadNodeMigrationRolloutEligibilitySummary({ workspaceRoot });
const rolloutApprovedNodeTypeSet = new Set<string>(rolloutApprovalsSummary.approvedNodeTypes);
const rolloutEligibleNodeTypeSet = new Set<string>(rolloutEligibilitySummary.eligibleNodeTypes);

if (!fs.existsSync(indexPath)) {
  console.error(`Missing migration index: ${path.relative(workspaceRoot, indexPath)}`);
  process.exit(1);
}
if (!fs.existsSync(guidePath)) {
  console.error(`Missing migration guide: ${path.relative(workspaceRoot, guidePath)}`);
  process.exit(1);
}
if (!fs.existsSync(perNodeDocsDir)) {
  console.error(`Missing per-node migration docs directory: ${path.relative(workspaceRoot, perNodeDocsDir)}`);
  process.exit(1);
}
if (!fs.existsSync(semanticNodeIndexPath)) {
  console.error(`Missing semantic node index: ${path.relative(workspaceRoot, semanticNodeIndexPath)}`);
  process.exit(1);
}
if (!fs.existsSync(v3IndexPath)) {
  console.error(`Missing v3 index: ${path.relative(workspaceRoot, v3IndexPath)}`);
  process.exit(1);
}
if (!fs.existsSync(v3ContractsPath)) {
  console.error(`Missing v3 contracts: ${path.relative(workspaceRoot, v3ContractsPath)}`);
  process.exit(1);
}
if (!fs.existsSync(parityEvidenceSummary.sourcePath)) {
  console.error(
    `Missing parity evidence file: ${path.relative(workspaceRoot, parityEvidenceSummary.sourcePath)}`
  );
  process.exit(1);
}
if (!fs.existsSync(rolloutApprovalsSummary.sourcePath)) {
  console.error(
    `Missing rollout approvals file: ${path.relative(workspaceRoot, rolloutApprovalsSummary.sourcePath)}`
  );
  process.exit(1);
}
if (!fs.existsSync(rolloutEligibilitySummary.sourcePath)) {
  console.error(
    `Missing rollout eligibility file: ${path.relative(workspaceRoot, rolloutEligibilitySummary.sourcePath)}`
  );
  process.exit(1);
}

let semanticNodeIndexRows: SemanticNodeIndexRow[];
try {
  semanticNodeIndexRows = JSON.parse(fs.readFileSync(semanticNodeIndexPath, 'utf8')) as SemanticNodeIndexRow[];
} catch (error) {
  console.error(
    `Failed to parse semantic node index: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

const semanticNodeHashByType = new Map<string, string>();
for (const row of semanticNodeIndexRows) {
  const nodeType = toSafeString(row?.nodeType);
  const nodeHash = toSafeString(row?.nodeHash).toLowerCase();
  if (!nodeType || !isSha256Hex(nodeHash)) continue;
  semanticNodeHashByType.set(nodeType, nodeHash);
}

let v3IndexPayload: NodeCodeObjectV3Index;
try {
  v3IndexPayload = JSON.parse(fs.readFileSync(v3IndexPath, 'utf8')) as NodeCodeObjectV3Index;
} catch (error) {
  console.error(`Failed to parse v3 index: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

let v3ContractsPayload: NodeCodeObjectV3Contracts;
try {
  v3ContractsPayload = JSON.parse(fs.readFileSync(v3ContractsPath, 'utf8')) as NodeCodeObjectV3Contracts;
} catch (error) {
  console.error(`Failed to parse v3 contracts: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

const v3IndexEntryByType = new Map<
  string,
  {
    objectId: string | null;
    objectFile: string | null;
    objectHash: string | null;
    codeObjectId: string | null;
  }
>();
for (const row of v3IndexPayload.objects ?? []) {
  const nodeType = toSafeString(row?.nodeType);
  if (!nodeType) continue;
  const objectId = toSafeString(row?.id) || null;
  const objectFile = toSafeString(row?.objectFile) || null;
  const objectHashRaw = toSafeString(row?.objectHash).toLowerCase();
  const objectHash = isSha256Hex(objectHashRaw) ? objectHashRaw : null;
  const codeObjectId = toSafeString(row?.codeObjectId) || null;
  v3IndexEntryByType.set(nodeType, {
    objectId,
    objectFile,
    objectHash,
    codeObjectId,
  });
}

const v3ContractsHashRaw = toSafeString(v3ContractsPayload.contractsHash).toLowerCase();
const v3ContractsHash = isSha256Hex(v3ContractsHashRaw) ? v3ContractsHashRaw : null;

let indexPayload: NodeMigrationIndexPayload;
try {
  indexPayload = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as NodeMigrationIndexPayload;
} catch (error) {
  console.error(
    `Failed to parse migration index: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

const errors: string[] = [];

if (parityEvidenceSummary.schemaVersion !== 'ai-paths.node-migration-parity-evidence.v1') {
  errors.push(
    `parity-evidence schemaVersion must be "ai-paths.node-migration-parity-evidence.v1" (got ${parityEvidenceSummary.schemaVersion ?? 'null'}).`
  );
}
if (rolloutApprovalsSummary.schemaVersion !== NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION) {
  errors.push(
    `rollout-approvals schemaVersion must be "${NODE_MIGRATION_ROLLOUT_APPROVALS_SCHEMA_VERSION}" (got ${rolloutApprovalsSummary.schemaVersion ?? 'null'}).`
  );
}
if (rolloutEligibilitySummary.schemaVersion !== NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION) {
  errors.push(
    `rollout-eligibility schemaVersion must be "${NODE_MIGRATION_ROLLOUT_ELIGIBILITY_SCHEMA_VERSION}" (got ${rolloutEligibilitySummary.schemaVersion ?? 'null'}).`
  );
}

if (indexPayload.schemaVersion !== 'ai-paths.node-migration-doc-index.v2') {
  errors.push('migration-index.json schemaVersion must be "ai-paths.node-migration-doc-index.v2".');
}

if (!Array.isArray(indexPayload.nodes)) {
  errors.push('migration-index.json nodes must be an array.');
}
if (indexPayload.v3ContractsHash !== null && indexPayload.v3ContractsHash !== undefined) {
  const declaredV3ContractsHash = toSafeString(indexPayload.v3ContractsHash).toLowerCase();
  if (!isSha256Hex(declaredV3ContractsHash)) {
    errors.push('migration-index.json v3ContractsHash must be null or sha256.');
  } else if (declaredV3ContractsHash !== v3ContractsHash) {
    errors.push(
      `migration-index.json v3ContractsHash mismatch (expected ${v3ContractsHash ?? 'null'}, got ${declaredV3ContractsHash}).`
    );
  }
} else if (v3ContractsHash) {
  errors.push('migration-index.json v3ContractsHash is missing while v3 contracts hash is available.');
}

const rows = Array.isArray(indexPayload.nodes) ? indexPayload.nodes : [];
const seenNodeTypes = new Set<string>();
const countedStrategies = {
  legacy_adapter: 0,
  code_object_v3: 0,
};
const declaredReadinessList: NodeMigrationReadiness[] = [];
const expectedMigrationDocFiles = new Set<string>();

const buildCodeObjectId = (nodeType: string): string => `ai-paths.node-code-object.${nodeType}.v3`;

for (const row of rows) {
  const nodeType = toSafeString(row?.nodeType);
  if (!nodeType) {
    errors.push('migration-index.json row has empty nodeType.');
    continue;
  }
  if (seenNodeTypes.has(nodeType)) {
    errors.push(`Duplicate nodeType in migration-index.json: ${nodeType}`);
    continue;
  }
  seenNodeTypes.add(nodeType);

  if (!expectedNodeTypes.has(nodeType)) {
    errors.push(`Unexpected nodeType in migration-index.json: ${nodeType}`);
  }

  const expectedNodeDoc = expectedNodeDocsByType.get(nodeType);
  if (!expectedNodeDoc) {
    errors.push(`${nodeType}: missing expected node documentation source.`);
    continue;
  }

  if (toSafeString(row.title) !== expectedNodeDoc.title.trim()) {
    errors.push(
      `${nodeType}: title mismatch (expected "${expectedNodeDoc.title}", got "${row.title}").`
    );
  }

  const expectedInputPorts = expectedNodeDoc.inputs;
  const expectedOutputPorts = expectedNodeDoc.outputs;
  const actualInputPorts = Array.isArray(row.ports?.inputs) ? row.ports.inputs : [];
  const actualOutputPorts = Array.isArray(row.ports?.outputs) ? row.ports.outputs : [];

  if (JSON.stringify(actualInputPorts) !== JSON.stringify(expectedInputPorts)) {
    errors.push(
      `${nodeType}: input ports mismatch (expected ${JSON.stringify(expectedInputPorts)}, got ${JSON.stringify(actualInputPorts)}).`
    );
  }
  if (JSON.stringify(actualOutputPorts) !== JSON.stringify(expectedOutputPorts)) {
    errors.push(
      `${nodeType}: output ports mismatch (expected ${JSON.stringify(expectedOutputPorts)}, got ${JSON.stringify(actualOutputPorts)}).`
    );
  }
  if (row.configFieldCount !== expectedNodeDoc.config.length) {
    errors.push(
      `${nodeType}: configFieldCount mismatch (expected ${expectedNodeDoc.config.length}, got ${row.configFieldCount}).`
    );
  }

  if (row.runtimeStrategy !== 'legacy_adapter' && row.runtimeStrategy !== 'code_object_v3') {
    errors.push(`${nodeType}: runtimeStrategy must be legacy_adapter or code_object_v3.`);
    continue;
  }

  countedStrategies[row.runtimeStrategy] += 1;

  const isRuntimeKernelNodeType = runtimeKernelNodeTypeSet.has(nodeType);
  const expectedStrategy = isRuntimeKernelNodeType ? 'code_object_v3' : 'legacy_adapter';
  if (row.runtimeStrategy !== expectedStrategy) {
    errors.push(`${nodeType}: runtimeStrategy mismatch (expected ${expectedStrategy}, got ${row.runtimeStrategy}).`);
  }

  const expectedWave = isRuntimeKernelNodeType ? 'pilot' : 'backlog';
  if (row.migrationWave !== expectedWave) {
    errors.push(`${nodeType}: migrationWave mismatch (expected ${expectedWave}, got ${row.migrationWave}).`);
  }

  if (isRuntimeKernelNodeType) {
    const expectedId = buildCodeObjectId(nodeType);
    if (row.codeObjectId !== expectedId) {
      errors.push(`${nodeType}: codeObjectId mismatch (expected ${expectedId}, got ${row.codeObjectId ?? 'null'}).`);
    }
    if (!row.docs.v3ScaffoldFile) {
      errors.push(`${nodeType}: runtime-kernel node must include docs.v3ScaffoldFile.`);
    }
  } else if (row.codeObjectId !== null) {
    errors.push(`${nodeType}: non-runtime-kernel node must have codeObjectId set to null.`);
  }

  const semanticNodeFile = toSafeString(row.docs?.semanticNodeFile);
  const semanticNodePath = path.join(workspaceRoot, semanticNodeFile);
  if (!semanticNodeFile || !fs.existsSync(semanticNodePath)) {
    errors.push(`${nodeType}: semantic node file missing (${semanticNodeFile || 'empty'}).`);
  }

  const v2ObjectFile = toSafeString(row.docs?.v2ObjectFile);
  const v2ObjectPath = path.join(workspaceRoot, v2ObjectFile);
  if (!v2ObjectFile || !fs.existsSync(v2ObjectPath)) {
    errors.push(`${nodeType}: v2 object file missing (${v2ObjectFile || 'empty'}).`);
  }

  if (row.docs?.v3ScaffoldFile) {
    const scaffoldPath = path.join(workspaceRoot, row.docs.v3ScaffoldFile);
    if (!fs.existsSync(scaffoldPath)) {
      errors.push(`${nodeType}: v3 scaffold file missing (${row.docs.v3ScaffoldFile}).`);
    }
  }

  const v3ObjectId = row.docs?.v3ObjectId;
  const normalizedV3ObjectId = v3ObjectId === null ? null : toSafeString(v3ObjectId);
  const v3ObjectHash = row.docs?.v3ObjectHash;
  const normalizedV3ObjectHash =
    v3ObjectHash === null ? null : toSafeString(v3ObjectHash).toLowerCase();
  if (normalizedV3ObjectHash !== null && !isSha256Hex(normalizedV3ObjectHash)) {
    errors.push(`${nodeType}: docs.v3ObjectHash must be null or sha256.`);
  }

  const v3IndexEntry = v3IndexEntryByType.get(nodeType) ?? null;
  if (isRuntimeKernelNodeType) {
    if (!v3IndexEntry) {
      errors.push(`${nodeType}: missing v3 index entry for runtime-kernel node.`);
    } else {
      if (!row.docs.v3ScaffoldFile || row.docs.v3ScaffoldFile !== v3IndexEntry.objectFile) {
        errors.push(
          `${nodeType}: docs.v3ScaffoldFile must match v3 index objectFile (${v3IndexEntry.objectFile ?? 'null'}).`
        );
      }
      if (normalizedV3ObjectId !== v3IndexEntry.objectId) {
        errors.push(
          `${nodeType}: docs.v3ObjectId mismatch (expected ${v3IndexEntry.objectId ?? 'null'}, got ${normalizedV3ObjectId ?? 'null'}).`
        );
      }
      if (normalizedV3ObjectHash !== v3IndexEntry.objectHash) {
        errors.push(
          `${nodeType}: docs.v3ObjectHash mismatch (expected ${v3IndexEntry.objectHash ?? 'null'}, got ${normalizedV3ObjectHash ?? 'null'}).`
        );
      }
      if (v3IndexEntry.codeObjectId !== row.codeObjectId) {
        errors.push(
          `${nodeType}: codeObjectId mismatch between migration index and v3 index (migration=${row.codeObjectId ?? 'null'}, v3=${v3IndexEntry.codeObjectId ?? 'null'}).`
        );
      }
    }
  } else {
    if (normalizedV3ObjectId !== null) {
      errors.push(`${nodeType}: non-runtime-kernel node must have docs.v3ObjectId set to null.`);
    }
    if (normalizedV3ObjectHash !== null) {
      errors.push(`${nodeType}: non-runtime-kernel node must have docs.v3ObjectHash set to null.`);
    }
  }

  const semanticHash = row.docs?.semanticNodeHash;
  const normalizedSemanticHash =
    semanticHash === null ? null : toSafeString(semanticHash).toLowerCase();
  if (normalizedSemanticHash !== null && !isSha256Hex(normalizedSemanticHash)) {
    errors.push(`${nodeType}: docs.semanticNodeHash must be null or sha256.`);
  }

  const semanticNodePathMatch = semanticNodeFile.match(
    /^docs\/ai-paths\/semantic-grammar\/nodes\/([a-z0-9_]+)\.json$/i
  );
  if (semanticNodePathMatch) {
    const semanticNodeTypeFromPath = toSafeString(semanticNodePathMatch[1]);
    if (semanticNodeTypeFromPath !== nodeType) {
      errors.push(
        `${nodeType}: semanticNodeFile node type mismatch (${semanticNodeTypeFromPath || 'empty'}).`
      );
    }
    const expectedSemanticHash = semanticNodeHashByType.get(nodeType) ?? null;
    if (!expectedSemanticHash) {
      errors.push(`${nodeType}: semantic hash missing in semantic node index.`);
    } else if (normalizedSemanticHash !== expectedSemanticHash) {
      errors.push(
        `${nodeType}: semantic hash mismatch (expected ${expectedSemanticHash}, got ${normalizedSemanticHash ?? 'null'}).`
      );
    }
  } else if (normalizedSemanticHash !== null) {
    errors.push(`${nodeType}: semanticNodeHash must be null when semanticNodeFile is not a semantic node JSON.`);
  }

  const declaredParityEvidenceSuiteIds = Array.isArray(row.parityEvidenceSuiteIds)
    ? row.parityEvidenceSuiteIds.map((suiteId) => toSafeString(suiteId)).filter(Boolean).sort()
    : [];
  const expectedParityEvidenceSuiteIds = (
    parityEvidenceSummary.suiteIdsByNodeType[nodeType] ?? []
  ).slice().sort();
  if (
    JSON.stringify(declaredParityEvidenceSuiteIds) !==
    JSON.stringify(expectedParityEvidenceSuiteIds)
  ) {
    errors.push(
      `${nodeType}: parityEvidenceSuiteIds mismatch (expected ${JSON.stringify(expectedParityEvidenceSuiteIds)}, got ${JSON.stringify(declaredParityEvidenceSuiteIds)}).`
    );
  }
  if (isRuntimeKernelNodeType && expectedParityEvidenceSuiteIds.length === 0) {
    errors.push(
      `${nodeType}: runtime-kernel node is missing parity evidence coverage in ${parityEvidenceSummary.sourceFile}.`
    );
  }

  const migrationDocFile = toSafeString(row.docs?.migrationDocFile);
  const migrationDocPath = path.join(workspaceRoot, migrationDocFile);
  const expectedMigrationDocFile = `docs/ai-paths/node-code-objects-v3/nodes/${nodeType}.md`;
  if (!migrationDocFile || migrationDocFile !== expectedMigrationDocFile) {
    errors.push(`${nodeType}: docs.migrationDocFile mismatch (expected ${expectedMigrationDocFile}, got ${migrationDocFile || 'empty'}).`);
  } else if (!fs.existsSync(migrationDocPath)) {
    errors.push(`${nodeType}: migration doc file missing (${migrationDocFile}).`);
  } else {
    expectedMigrationDocFiles.add(migrationDocFile);
    const migrationDocRaw = fs.readFileSync(migrationDocPath, 'utf8');
    if (!migrationDocRaw.includes(`\`${nodeType}\``)) {
      errors.push(`${nodeType}: migration sheet must reference nodeType token.`);
    }
    if (!migrationDocRaw.includes(`- Runtime strategy: \`${row.runtimeStrategy}\``)) {
      errors.push(`${nodeType}: migration sheet runtime strategy line mismatch.`);
    }
    if (!migrationDocRaw.includes(`- Readiness stage: \`${row.migrationReadiness.stage}\``)) {
      errors.push(`${nodeType}: migration sheet readiness stage line mismatch.`);
    }
    const expectedParityEvidenceLine = `- Parity evidence suite IDs: ${
      declaredParityEvidenceSuiteIds.length > 0
        ? declaredParityEvidenceSuiteIds.map((suiteId) => `\`${suiteId}\``).join(', ')
        : '`none`'
    }`;
    if (!migrationDocRaw.includes(expectedParityEvidenceLine)) {
      errors.push(`${nodeType}: migration sheet parity evidence line mismatch.`);
    }
    const expectedRolloutApprovedLine = `- Rollout approved: ${row.migrationChecklistTemplate.rolloutApproved ? '`yes`' : '`no`'} (source: \`${rolloutApprovalsSummary.sourceFile}\`)`;
    if (!migrationDocRaw.includes(expectedRolloutApprovedLine)) {
      errors.push(`${nodeType}: migration sheet rollout approval line mismatch.`);
    }
    const expectedV3ObjectIdLine = `- v3 object id: ${row.docs.v3ObjectId ? `\`${row.docs.v3ObjectId}\`` : '`missing`'}`;
    if (!migrationDocRaw.includes(expectedV3ObjectIdLine)) {
      errors.push(`${nodeType}: migration sheet v3 object id line mismatch.`);
    }
    if (!migrationDocRaw.includes('## Migration Checklist')) {
      errors.push(`${nodeType}: migration sheet missing checklist section.`);
    }
  }

  if (!Array.isArray(row.ports?.inputs) || !Array.isArray(row.ports?.outputs)) {
    errors.push(`${nodeType}: ports.inputs and ports.outputs must be arrays.`);
  }
  if (!Number.isInteger(row.configFieldCount) || row.configFieldCount < 0) {
    errors.push(`${nodeType}: configFieldCount must be a non-negative integer.`);
  }

  if (typeof row.title !== 'string' || row.title.trim().length === 0) {
    errors.push(`${nodeType}: title must be non-empty.`);
  }
  if (typeof row.nodeFamily !== 'string' || row.nodeFamily.trim().length === 0) {
    errors.push(`${nodeType}: nodeFamily must be non-empty.`);
  }

  if (
    typeof row.migrationChecklistTemplate?.semanticContractReviewed !== 'boolean' ||
    typeof row.migrationChecklistTemplate?.v3CodeObjectAuthored !== 'boolean' ||
    typeof row.migrationChecklistTemplate?.dualRunParityValidated !== 'boolean' ||
    typeof row.migrationChecklistTemplate?.rolloutApproved !== 'boolean'
  ) {
      errors.push(`${nodeType}: migrationChecklistTemplate must contain boolean fields.`);
  }

  const expectedChecklist = {
    semanticContractReviewed: Boolean(semanticNodeFile),
    v3CodeObjectAuthored: isRuntimeKernelNodeType && Boolean(row.docs?.v3ScaffoldFile),
    dualRunParityValidated: expectedParityEvidenceSuiteIds.length > 0,
    rolloutApproved:
      isRuntimeKernelNodeType && rolloutApprovedNodeTypeSet.has(nodeType),
  };
  if (row.migrationChecklistTemplate?.semanticContractReviewed !== expectedChecklist.semanticContractReviewed) {
    errors.push(
      `${nodeType}: migrationChecklistTemplate.semanticContractReviewed mismatch (expected ${String(expectedChecklist.semanticContractReviewed)}, got ${String(row.migrationChecklistTemplate?.semanticContractReviewed)}).`
    );
  }
  if (row.migrationChecklistTemplate?.v3CodeObjectAuthored !== expectedChecklist.v3CodeObjectAuthored) {
    errors.push(
      `${nodeType}: migrationChecklistTemplate.v3CodeObjectAuthored mismatch (expected ${String(expectedChecklist.v3CodeObjectAuthored)}, got ${String(row.migrationChecklistTemplate?.v3CodeObjectAuthored)}).`
    );
  }
  if (row.migrationChecklistTemplate?.dualRunParityValidated !== expectedChecklist.dualRunParityValidated) {
    errors.push(
      `${nodeType}: migrationChecklistTemplate.dualRunParityValidated mismatch (expected ${String(expectedChecklist.dualRunParityValidated)}, got ${String(row.migrationChecklistTemplate?.dualRunParityValidated)}).`
    );
  }
  if (row.migrationChecklistTemplate?.rolloutApproved !== expectedChecklist.rolloutApproved) {
    errors.push(
      `${nodeType}: migrationChecklistTemplate.rolloutApproved mismatch (expected ${String(expectedChecklist.rolloutApproved)}, got ${String(row.migrationChecklistTemplate?.rolloutApproved)}).`
    );
  }

  const declaredReadiness = row.migrationReadiness;
  const normalizedReadinessStage = toSafeString(declaredReadiness?.stage) as NodeMigrationReadinessStage;
  const declaredReadinessScore = Number(declaredReadiness?.score);
  const declaredReadinessBlockers = Array.isArray(declaredReadiness?.blockers)
    ? declaredReadiness.blockers.map((entry) => toSafeString(entry)).filter(Boolean)
    : [];

  if (!NODE_MIGRATION_READINESS_STAGES.includes(normalizedReadinessStage)) {
    errors.push(`${nodeType}: migrationReadiness.stage is invalid (${String(declaredReadiness?.stage)}).`);
  }
  if (!Number.isInteger(declaredReadinessScore) || declaredReadinessScore < 0 || declaredReadinessScore > 100) {
    errors.push(`${nodeType}: migrationReadiness.score must be an integer between 0 and 100.`);
  }
  for (const blocker of declaredReadinessBlockers) {
    if (!NODE_MIGRATION_READINESS_BLOCKER_CODES.includes(blocker as NodeMigrationReadinessBlockerCode)) {
      errors.push(`${nodeType}: migrationReadiness.blockers contains unknown code ${blocker}.`);
    }
  }

  const expectedReadiness = computeNodeMigrationReadiness({
    runtimeStrategy: row.runtimeStrategy,
    hasSemanticContractHash: Boolean(normalizedSemanticHash),
    hasV2ObjectContract: Boolean(v2ObjectFile && fs.existsSync(v2ObjectPath)),
    hasV3Scaffold: Boolean(row.docs?.v3ScaffoldFile),
    hasV3ObjectArtifacts: Boolean(normalizedV3ObjectId && normalizedV3ObjectHash),
    checklist: expectedChecklist,
  });

  const normalizedDeclaredReadinessBlockers = [...declaredReadinessBlockers].sort((left, right) =>
    left.localeCompare(right)
  );
  if (normalizedReadinessStage !== expectedReadiness.stage) {
    errors.push(
      `${nodeType}: migrationReadiness.stage mismatch (expected ${expectedReadiness.stage}, got ${normalizedReadinessStage || 'empty'}).`
    );
  }
  if (declaredReadinessScore !== expectedReadiness.score) {
    errors.push(
      `${nodeType}: migrationReadiness.score mismatch (expected ${expectedReadiness.score}, got ${declaredReadinessScore}).`
    );
  }
  if (JSON.stringify(normalizedDeclaredReadinessBlockers) !== JSON.stringify(expectedReadiness.blockers)) {
    errors.push(
      `${nodeType}: migrationReadiness.blockers mismatch (expected ${JSON.stringify(expectedReadiness.blockers)}, got ${JSON.stringify(normalizedDeclaredReadinessBlockers)}).`
    );
  }

  declaredReadinessList.push(expectedReadiness);
}

const missingNodeTypes = [...expectedNodeTypes].filter((nodeType) => !seenNodeTypes.has(nodeType));
if (missingNodeTypes.length > 0) {
  errors.push(`Missing node types in migration-index.json: ${missingNodeTypes.join(', ')}`);
}

if (indexPayload.totalNodes !== rows.length) {
  errors.push(
    `migration-index.json totalNodes mismatch (declared=${indexPayload.totalNodes}, actual=${rows.length}).`
  );
}

if (
  indexPayload.strategyTotals?.legacy_adapter !== countedStrategies.legacy_adapter ||
  indexPayload.strategyTotals?.code_object_v3 !== countedStrategies.code_object_v3
) {
  errors.push(
    `migration-index.json strategyTotals mismatch (declared=${JSON.stringify(indexPayload.strategyTotals)}, actual=${JSON.stringify(countedStrategies)}).`
  );
}

const readinessSummary = summarizeNodeMigrationReadiness(declaredReadinessList);
if (!indexPayload.readiness || typeof indexPayload.readiness !== 'object') {
  errors.push('migration-index.json readiness summary is missing.');
} else {
  if (indexPayload.readiness.averageScore !== readinessSummary.averageScore) {
    errors.push(
      `migration-index.json readiness.averageScore mismatch (declared=${indexPayload.readiness.averageScore}, expected=${readinessSummary.averageScore}).`
    );
  }

  for (const stage of NODE_MIGRATION_READINESS_STAGES) {
    const declared = indexPayload.readiness.totalsByStage?.[stage];
    const expected = readinessSummary.totalsByStage[stage];
    if (declared !== expected) {
      errors.push(
        `migration-index.json readiness.totalsByStage.${stage} mismatch (declared=${declared}, expected=${expected}).`
      );
    }
  }

  const declaredTopBlockers = Array.isArray(indexPayload.readiness.topBlockers)
    ? indexPayload.readiness.topBlockers.map((entry) => ({
        code: toSafeString(entry?.code),
        count: Number(entry?.count),
      }))
    : [];

  if (declaredTopBlockers.length !== readinessSummary.blockers.length) {
    errors.push(
      `migration-index.json readiness.topBlockers length mismatch (declared=${declaredTopBlockers.length}, expected=${readinessSummary.blockers.length}).`
    );
  } else {
    for (let index = 0; index < declaredTopBlockers.length; index += 1) {
      const declared = declaredTopBlockers[index];
      const expected = readinessSummary.blockers[index];
      if (!declared || !expected) {
        errors.push(
          `migration-index.json readiness.topBlockers[${index}] is missing while comparing normalized summaries.`
        );
        continue;
      }
      if (declared.code !== expected.code || declared.count !== expected.count) {
        errors.push(
          `migration-index.json readiness.topBlockers[${index}] mismatch (declared=${JSON.stringify(declared)}, expected=${JSON.stringify(expected)}).`
        );
      }
    }
  }
}

if (!indexPayload.parityEvidence || typeof indexPayload.parityEvidence !== 'object') {
  errors.push('migration-index.json parityEvidence summary is missing.');
} else {
  const declaredSourceFile = toSafeString(indexPayload.parityEvidence.sourceFile);
  if (declaredSourceFile !== parityEvidenceSummary.sourceFile) {
    errors.push(
      `migration-index.json parityEvidence.sourceFile mismatch (declared=${declaredSourceFile || 'empty'}, expected=${parityEvidenceSummary.sourceFile}).`
    );
  }

  const declaredSchemaVersionRaw = indexPayload.parityEvidence.schemaVersion;
  const declaredSchemaVersion =
    declaredSchemaVersionRaw === null || declaredSchemaVersionRaw === undefined
      ? null
      : toSafeString(declaredSchemaVersionRaw) || null;
  if (declaredSchemaVersion !== parityEvidenceSummary.schemaVersion) {
    errors.push(
      `migration-index.json parityEvidence.schemaVersion mismatch (declared=${declaredSchemaVersion ?? 'null'}, expected=${parityEvidenceSummary.schemaVersion ?? 'null'}).`
    );
  }

  const declaredGeneratedAtRaw = indexPayload.parityEvidence.generatedAt;
  const declaredGeneratedAt =
    declaredGeneratedAtRaw === null || declaredGeneratedAtRaw === undefined
      ? null
      : toSafeString(declaredGeneratedAtRaw) || null;
  if (declaredGeneratedAt !== parityEvidenceSummary.generatedAt) {
    errors.push(
      `migration-index.json parityEvidence.generatedAt mismatch (declared=${declaredGeneratedAt ?? 'null'}, expected=${parityEvidenceSummary.generatedAt ?? 'null'}).`
    );
  }

  const declaredSuiteCount = Number(indexPayload.parityEvidence.suiteCount);
  if (declaredSuiteCount !== parityEvidenceSummary.suiteCount) {
    errors.push(
      `migration-index.json parityEvidence.suiteCount mismatch (declared=${String(indexPayload.parityEvidence.suiteCount)}, expected=${parityEvidenceSummary.suiteCount}).`
    );
  }

  const declaredSuiteIds = Array.isArray(indexPayload.parityEvidence.suiteIds)
    ? indexPayload.parityEvidence.suiteIds.map((entry) => toSafeString(entry)).filter(Boolean).sort()
    : [];
  if (JSON.stringify(declaredSuiteIds) !== JSON.stringify(parityEvidenceSummary.suiteIds)) {
    errors.push(
      `migration-index.json parityEvidence.suiteIds mismatch (declared=${JSON.stringify(declaredSuiteIds)}, expected=${JSON.stringify(parityEvidenceSummary.suiteIds)}).`
    );
  }

  const declaredValidatedNodeTypes = Array.isArray(indexPayload.parityEvidence.validatedNodeTypes)
    ? indexPayload.parityEvidence.validatedNodeTypes
      .map((entry) => toSafeString(entry))
      .filter(Boolean)
      .sort()
    : [];
  if (
    JSON.stringify(declaredValidatedNodeTypes) !==
    JSON.stringify(parityEvidenceSummary.validatedNodeTypes)
  ) {
    errors.push(
      `migration-index.json parityEvidence.validatedNodeTypes mismatch (declared=${JSON.stringify(declaredValidatedNodeTypes)}, expected=${JSON.stringify(parityEvidenceSummary.validatedNodeTypes)}).`
    );
  }
}

if (!indexPayload.rolloutApprovals || typeof indexPayload.rolloutApprovals !== 'object') {
  errors.push('migration-index.json rolloutApprovals summary is missing.');
} else {
  const declaredSourceFile = toSafeString(indexPayload.rolloutApprovals.sourceFile);
  if (declaredSourceFile !== rolloutApprovalsSummary.sourceFile) {
    errors.push(
      `migration-index.json rolloutApprovals.sourceFile mismatch (declared=${declaredSourceFile || 'empty'}, expected=${rolloutApprovalsSummary.sourceFile}).`
    );
  }

  const declaredSchemaVersionRaw = indexPayload.rolloutApprovals.schemaVersion;
  const declaredSchemaVersion =
    declaredSchemaVersionRaw === null || declaredSchemaVersionRaw === undefined
      ? null
      : toSafeString(declaredSchemaVersionRaw) || null;
  if (declaredSchemaVersion !== rolloutApprovalsSummary.schemaVersion) {
    errors.push(
      `migration-index.json rolloutApprovals.schemaVersion mismatch (declared=${declaredSchemaVersion ?? 'null'}, expected=${rolloutApprovalsSummary.schemaVersion ?? 'null'}).`
    );
  }

  const declaredGeneratedAtRaw = indexPayload.rolloutApprovals.generatedAt;
  const declaredGeneratedAt =
    declaredGeneratedAtRaw === null || declaredGeneratedAtRaw === undefined
      ? null
      : toSafeString(declaredGeneratedAtRaw) || null;
  if (declaredGeneratedAt !== rolloutApprovalsSummary.generatedAt) {
    errors.push(
      `migration-index.json rolloutApprovals.generatedAt mismatch (declared=${declaredGeneratedAt ?? 'null'}, expected=${rolloutApprovalsSummary.generatedAt ?? 'null'}).`
    );
  }

  const declaredApprovedNodeTypes = Array.isArray(indexPayload.rolloutApprovals.approvedNodeTypes)
    ? indexPayload.rolloutApprovals.approvedNodeTypes
      .map((entry) => toSafeString(entry))
      .filter(Boolean)
      .sort()
    : [];
  if (
    JSON.stringify(declaredApprovedNodeTypes) !==
    JSON.stringify(rolloutApprovalsSummary.approvedNodeTypes)
  ) {
    errors.push(
      `migration-index.json rolloutApprovals.approvedNodeTypes mismatch (declared=${JSON.stringify(declaredApprovedNodeTypes)}, expected=${JSON.stringify(rolloutApprovalsSummary.approvedNodeTypes)}).`
    );
  }

  const declaredApprovedCount = Number(indexPayload.rolloutApprovals.approvedCount);
  if (declaredApprovedCount !== rolloutApprovalsSummary.approvedNodeTypes.length) {
    errors.push(
      `migration-index.json rolloutApprovals.approvedCount mismatch (declared=${String(indexPayload.rolloutApprovals.approvedCount)}, expected=${rolloutApprovalsSummary.approvedNodeTypes.length}).`
    );
  }
}

if (!indexPayload.rolloutEligibility || typeof indexPayload.rolloutEligibility !== 'object') {
  errors.push('migration-index.json rolloutEligibility summary is missing.');
} else {
  const declaredSourceFile = toSafeString(indexPayload.rolloutEligibility.sourceFile);
  if (declaredSourceFile !== rolloutEligibilitySummary.sourceFile) {
    errors.push(
      `migration-index.json rolloutEligibility.sourceFile mismatch (declared=${declaredSourceFile || 'empty'}, expected=${rolloutEligibilitySummary.sourceFile}).`
    );
  }

  const declaredSchemaVersion = toSafeString(indexPayload.rolloutEligibility.schemaVersion);
  if (declaredSchemaVersion !== rolloutEligibilitySummary.schemaVersion) {
    errors.push(
      `migration-index.json rolloutEligibility.schemaVersion mismatch (declared=${declaredSchemaVersion || 'empty'}, expected=${rolloutEligibilitySummary.schemaVersion ?? 'null'}).`
    );
  }

  const declaredGeneratedAt = toSafeString(indexPayload.rolloutEligibility.generatedAt);
  if (declaredGeneratedAt !== rolloutEligibilitySummary.generatedAt) {
    errors.push(
      `migration-index.json rolloutEligibility.generatedAt mismatch (declared=${declaredGeneratedAt || 'empty'}, expected=${rolloutEligibilitySummary.generatedAt ?? 'null'}).`
    );
  }

  const declaredCriteria = Array.isArray(indexPayload.rolloutEligibility.criteria)
    ? indexPayload.rolloutEligibility.criteria.map((entry) => toSafeString(entry)).filter(Boolean).sort()
    : [];
  if (JSON.stringify(declaredCriteria) !== JSON.stringify(rolloutEligibilitySummary.criteria)) {
    errors.push(
      `migration-index.json rolloutEligibility.criteria mismatch (declared=${JSON.stringify(declaredCriteria)}, expected=${JSON.stringify(rolloutEligibilitySummary.criteria)}).`
    );
  }

  const declaredEligibleNodeTypes = Array.isArray(indexPayload.rolloutEligibility.eligibleNodeTypes)
    ? indexPayload.rolloutEligibility.eligibleNodeTypes
      .map((entry) => toSafeString(entry))
      .filter(Boolean)
      .sort()
    : [];
  if (
    JSON.stringify(declaredEligibleNodeTypes) !==
    JSON.stringify(rolloutEligibilitySummary.eligibleNodeTypes)
  ) {
    errors.push(
      `migration-index.json rolloutEligibility.eligibleNodeTypes mismatch (declared=${JSON.stringify(declaredEligibleNodeTypes)}, expected=${JSON.stringify(rolloutEligibilitySummary.eligibleNodeTypes)}).`
    );
  }

  const declaredEligibleCount = Number(indexPayload.rolloutEligibility.eligibleCount);
  if (declaredEligibleCount !== rolloutEligibilitySummary.eligibleNodeTypes.length) {
    errors.push(
      `migration-index.json rolloutEligibility.eligibleCount mismatch (declared=${String(indexPayload.rolloutEligibility.eligibleCount)}, expected=${rolloutEligibilitySummary.eligibleNodeTypes.length}).`
    );
  }
}

const declaredRuntimeKernelNodeTypes = new Set<string>(
  readDeclaredRuntimeKernelNodeTypes(indexPayload)
);
for (const runtimeKernelNodeType of runtimeKernelNodeTypeSet) {
  if (!declaredRuntimeKernelNodeTypes.has(runtimeKernelNodeType)) {
    errors.push(`migration-index.json missing runtimeKernelNodeType=${runtimeKernelNodeType}.`);
  }
}
for (const declared of declaredRuntimeKernelNodeTypes) {
  if (!runtimeKernelNodeTypeSet.has(declared)) {
    errors.push(`migration-index.json has unexpected runtimeKernelNodeType=${declared}.`);
  }
}
for (const approvedNodeType of rolloutApprovalsSummary.approvedNodeTypes) {
  if (!expectedNodeTypes.has(approvedNodeType)) {
    errors.push(`rollout-approvals has unknown nodeType=${approvedNodeType}.`);
    continue;
  }
  if (!runtimeKernelNodeTypeSet.has(approvedNodeType)) {
    errors.push(`rollout-approvals nodeType=${approvedNodeType} is not in the canonical runtime-kernel set.`);
  }
  if (!rolloutEligibleNodeTypeSet.has(approvedNodeType)) {
    errors.push(`rollout-approvals nodeType=${approvedNodeType} is not technically eligible.`);
  }
}
const declaredRowsByNodeType = new Map<string, NodeMigrationIndexRow>(rows.map((row) => [row.nodeType, row]));
for (const eligibleNodeType of rolloutEligibilitySummary.eligibleNodeTypes) {
  const row = declaredRowsByNodeType.get(eligibleNodeType);
  if (!row) {
    errors.push(`rollout-eligibility has unknown nodeType=${eligibleNodeType}.`);
    continue;
  }
  if (!runtimeKernelNodeTypeSet.has(eligibleNodeType)) {
    errors.push(`rollout-eligibility nodeType=${eligibleNodeType} is not in the canonical runtime-kernel set.`);
  }
  if (
    row.migrationReadiness.stage !== 'rollout_candidate' &&
    row.migrationReadiness.stage !== 'rollout_approved'
  ) {
    errors.push(
      `rollout-eligibility nodeType=${eligibleNodeType} must be rollout_candidate or rollout_approved (got ${row.migrationReadiness.stage}).`
    );
  }
  if (row.parityEvidenceSuiteIds.length === 0) {
    errors.push(`rollout-eligibility nodeType=${eligibleNodeType} is missing parity evidence.`);
  }
}

const guideRaw = fs.readFileSync(guidePath, 'utf8');
if (!guideRaw.includes('# Node Migration Guide (Semantic Portable Engine)')) {
  errors.push('MIGRATION_GUIDE.md is missing the expected title header.');
}
if (!guideRaw.includes('## Node Coverage Matrix')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Node Coverage Matrix" section.');
}
if (!guideRaw.includes('## Readiness Scorecard')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Readiness Scorecard" section.');
}
if (!guideRaw.includes('## Parity Evidence')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Parity Evidence" section.');
}
if (!guideRaw.includes('## Rollout Approvals')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Rollout Approvals" section.');
}
if (!guideRaw.includes('## Rollout Eligibility')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Rollout Eligibility" section.');
}
if (!guideRaw.includes('## Per-Node Sheets')) {
  errors.push('MIGRATION_GUIDE.md is missing the "Per-Node Sheets" section.');
}

const actualMigrationDocFiles = new Set<string>(
  fs.readdirSync(perNodeDocsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => `docs/ai-paths/node-code-objects-v3/nodes/${entry.name}`)
);

for (const expectedFile of expectedMigrationDocFiles) {
  if (!actualMigrationDocFiles.has(expectedFile)) {
    errors.push(`Missing per-node migration sheet: ${expectedFile}.`);
  }
}

for (const actualFile of actualMigrationDocFiles) {
  if (!expectedMigrationDocFiles.has(actualFile)) {
    errors.push(`Unexpected per-node migration sheet: ${actualFile}.`);
  }
}

if (errors.length > 0) {
  console.error('AI-Paths node migration docs check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`AI-Paths node migration docs check passed for ${rows.length} node types.`);
