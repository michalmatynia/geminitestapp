import fs from 'node:fs';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import {
  type NodeMigrationReadiness,
  type NodeMigrationReadinessBlockerCode,
  type NodeMigrationReadinessStage,
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
  migrationReadiness: NodeMigrationReadiness;
};

type NodeMigrationIndexPayload = {
  schemaVersion: string;
  generatedAt: string;
  totalNodes: number;
  pilotNodeTypes: string[];
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

const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

const expectedNodeTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));
const expectedNodeDocsByType = new Map<string, (typeof AI_PATHS_NODE_DOCS)[number]>(
  AI_PATHS_NODE_DOCS.map((doc) => [doc.type, doc])
);
const pilotNodeTypeSet = new Set<string>(
  NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: string): string =>
    typeof entry === 'string' ? entry.trim() : ''
  ).filter(Boolean)
);

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

  const isPilot = pilotNodeTypeSet.has(nodeType);
  const expectedStrategy = isPilot ? 'code_object_v3' : 'legacy_adapter';
  if (row.runtimeStrategy !== expectedStrategy) {
    errors.push(`${nodeType}: runtimeStrategy mismatch (expected ${expectedStrategy}, got ${row.runtimeStrategy}).`);
  }

  const expectedWave = isPilot ? 'pilot' : 'backlog';
  if (row.migrationWave !== expectedWave) {
    errors.push(`${nodeType}: migrationWave mismatch (expected ${expectedWave}, got ${row.migrationWave}).`);
  }

  if (isPilot) {
    const expectedId = buildCodeObjectId(nodeType);
    if (row.codeObjectId !== expectedId) {
      errors.push(`${nodeType}: codeObjectId mismatch (expected ${expectedId}, got ${row.codeObjectId ?? 'null'}).`);
    }
    if (!row.docs.v3ScaffoldFile) {
      errors.push(`${nodeType}: pilot node must include docs.v3ScaffoldFile.`);
    }
  } else if (row.codeObjectId !== null) {
    errors.push(`${nodeType}: non-pilot node must have codeObjectId set to null.`);
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
  if (isPilot) {
    if (!v3IndexEntry) {
      errors.push(`${nodeType}: missing v3 index entry for pilot node.`);
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
      errors.push(`${nodeType}: non-pilot node must have docs.v3ObjectId set to null.`);
    }
    if (normalizedV3ObjectHash !== null) {
      errors.push(`${nodeType}: non-pilot node must have docs.v3ObjectHash set to null.`);
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
    checklist: row.migrationChecklistTemplate,
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
      if (declared.code !== expected.code || declared.count !== expected.count) {
        errors.push(
          `migration-index.json readiness.topBlockers[${index}] mismatch (declared=${JSON.stringify(declared)}, expected=${JSON.stringify(expected)}).`
        );
      }
    }
  }
}

const declaredPilotTypes = new Set<string>((indexPayload.pilotNodeTypes ?? []).map(toSafeString).filter(Boolean));
for (const pilotNodeType of pilotNodeTypeSet) {
  if (!declaredPilotTypes.has(pilotNodeType)) {
    errors.push(`migration-index.json missing pilotNodeType=${pilotNodeType}.`);
  }
}
for (const declared of declaredPilotTypes) {
  if (!pilotNodeTypeSet.has(declared)) {
    errors.push(`migration-index.json has unexpected pilotNodeType=${declared}.`);
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
