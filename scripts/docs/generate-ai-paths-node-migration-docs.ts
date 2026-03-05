import fs from 'node:fs';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import { resolveDocsGeneratedAt } from './docs-generated-at';
import { loadNodeMigrationParityEvidenceSummary } from './node-migration-parity-evidence';
import { loadNodeMigrationRolloutApprovalsSummary } from './node-migration-rollout-approvals';
import {
  type NodeMigrationReadiness,
  type NodeMigrationReadinessBlockerCode,
  type NodeMigrationReadinessStage,
  computeNodeMigrationReadiness,
  summarizeNodeMigrationReadiness,
} from './node-migration-readiness';

type SemanticNodeIndexRow = {
  nodeType: string;
  nodeHash?: string;
};

type NodeCodeObjectV2IndexRow = {
  nodeType: string;
  nodeFamily?: string;
  objectFile?: string;
};

type NodeCodeObjectV3ScaffoldIndex = {
  objects?: Array<{
    nodeType?: string;
    objectFile?: string;
  }>;
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
  schemaVersion: 'ai-paths.node-migration-doc-index.v2';
  generatedAt: string;
  totalNodes: number;
  pilotNodeTypes: string[];
  strategyTotals: {
    legacy_adapter: number;
    code_object_v3: number;
  };
  v3ContractsHash: string | null;
  readiness: {
    averageScore: number;
    totalsByStage: Record<NodeMigrationReadinessStage, number>;
    topBlockers: Array<{
      code: NodeMigrationReadinessBlockerCode;
      count: number;
    }>;
  };
  parityEvidence: {
    sourceFile: string;
    schemaVersion: string | null;
    generatedAt: string | null;
    suiteCount: number;
    suiteIds: string[];
    validatedNodeTypes: string[];
  };
  rolloutApprovals: {
    sourceFile: string;
    schemaVersion: string | null;
    generatedAt: string | null;
    approvedNodeTypes: string[];
    approvedCount: number;
  };
  familyTotals: Array<{
    nodeFamily: string;
    total: number;
    legacy_adapter: number;
    code_object_v3: number;
  }>;
  nodes: NodeMigrationIndexRow[];
};

const workspaceRoot = process.cwd();
const outputDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v3');
const semanticNodeIndexPath = path.join(workspaceRoot, 'docs/ai-paths/semantic-grammar/nodes/index.json');
const v2IndexPath = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v2/index.json');
const v3ScaffoldIndexPath = path.join(outputDir, 'index.scaffold.json');
const v3IndexPath = path.join(outputDir, 'index.json');
const v3ContractsPath = path.join(outputDir, 'contracts.json');
const outputIndexPath = path.join(outputDir, 'migration-index.json');
const outputGuidePath = path.join(outputDir, 'MIGRATION_GUIDE.md');
const perNodeDocsDir = path.join(outputDir, 'nodes');

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const readJsonFile = <T>(filePath: string, fallback: T): T => {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
  } catch {
    return fallback;
  }
};

const toSafeNodeType = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toSafeFilePath = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

const buildCodeObjectId = (nodeType: string): string => `ai-paths.node-code-object.${nodeType}.v3`;

const semanticIndexRows = readJsonFile<SemanticNodeIndexRow[]>(semanticNodeIndexPath, []);
const semanticHashByNodeType = new Map<string, string>();
for (const row of semanticIndexRows) {
  const nodeType = toSafeNodeType(row?.nodeType);
  const nodeHash = typeof row?.nodeHash === 'string' ? row.nodeHash.trim() : '';
  if (!nodeType || !isSha256Hex(nodeHash)) continue;
  semanticHashByNodeType.set(nodeType, nodeHash.toLowerCase());
}

const v2IndexRowsRaw = readJsonFile<{ objects?: NodeCodeObjectV2IndexRow[] }>(v2IndexPath, {
  objects: [],
});
const v2InfoByNodeType = new Map<
  string,
  {
    nodeFamily: string;
    objectFile: string;
  }
>();
for (const row of v2IndexRowsRaw.objects ?? []) {
  const nodeType = toSafeNodeType(row?.nodeType);
  if (!nodeType) continue;
  const nodeFamily =
    typeof row?.nodeFamily === 'string' && row.nodeFamily.trim().length > 0
      ? row.nodeFamily.trim()
      : 'general';
  const objectFile = toSafeFilePath(row?.objectFile) || `docs/ai-paths/node-code-objects-v2/${nodeType}.json`;
  v2InfoByNodeType.set(nodeType, { nodeFamily, objectFile });
}

const v3ScaffoldIndex = readJsonFile<NodeCodeObjectV3ScaffoldIndex>(v3ScaffoldIndexPath, {
  objects: [],
});
const scaffoldFileByNodeType = new Map<string, string>();
for (const row of v3ScaffoldIndex.objects ?? []) {
  const nodeType = toSafeNodeType(row?.nodeType);
  const objectFile = toSafeFilePath(row?.objectFile);
  if (!nodeType || !objectFile) continue;
  scaffoldFileByNodeType.set(nodeType, objectFile);
}

const v3Index = readJsonFile<NodeCodeObjectV3Index>(v3IndexPath, {
  objects: [],
});
const v3Contracts = readJsonFile<NodeCodeObjectV3Contracts>(v3ContractsPath, {});
const v3IndexEntryByNodeType = new Map<
  string,
  {
    objectId: string | null;
    objectFile: string | null;
    objectHash: string | null;
    codeObjectId: string | null;
  }
>();
for (const row of v3Index.objects ?? []) {
  const nodeType = toSafeNodeType(row?.nodeType);
  if (!nodeType) continue;
  const objectId = toSafeNodeType(row?.id) || null;
  const objectFile = toSafeFilePath(row?.objectFile) || null;
  const objectHashRaw = toSafeNodeType(row?.objectHash).toLowerCase();
  const objectHash = isSha256Hex(objectHashRaw) ? objectHashRaw : null;
  const codeObjectId = toSafeNodeType(row?.codeObjectId) || null;
  v3IndexEntryByNodeType.set(nodeType, {
    objectId,
    objectFile,
    objectHash,
    codeObjectId,
  });
}

const v3ContractsHashRaw =
  typeof v3Contracts.contractsHash === 'string' ? v3Contracts.contractsHash.trim().toLowerCase() : '';
const v3ContractsHash = isSha256Hex(v3ContractsHashRaw) ? v3ContractsHashRaw : null;

const pilotNodeTypes = Array.from(
  new Set(
    NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: string): string =>
      typeof entry === 'string' ? entry.trim() : ''
    ).filter(Boolean)
  )
).sort((left, right) => left.localeCompare(right));
const pilotNodeTypeSet = new Set<string>(pilotNodeTypes);
const parityEvidenceSummary = loadNodeMigrationParityEvidenceSummary({ workspaceRoot });
const rolloutApprovalsSummary = loadNodeMigrationRolloutApprovalsSummary({ workspaceRoot });
const rolloutApprovedNodeTypeSet = new Set<string>(rolloutApprovalsSummary.approvedNodeTypes);

const rows: NodeMigrationIndexRow[] = [...AI_PATHS_NODE_DOCS]
  .sort((left, right) => left.type.localeCompare(right.type))
  .map((doc) => {
    const nodeType = doc.type;
    const v2Info = v2InfoByNodeType.get(nodeType);
    const isPilot = pilotNodeTypeSet.has(nodeType);
    const runtimeStrategy: 'legacy_adapter' | 'code_object_v3' = isPilot
      ? 'code_object_v3'
      : 'legacy_adapter';
    const scaffoldFileFromIndex = scaffoldFileByNodeType.get(nodeType) ?? null;
    const fallbackScaffoldFile = `docs/ai-paths/node-code-objects-v3/${nodeType}.scaffold.json`;
    const scaffoldFile = scaffoldFileFromIndex
      ? scaffoldFileFromIndex
      : fs.existsSync(path.join(workspaceRoot, fallbackScaffoldFile))
        ? fallbackScaffoldFile
        : null;
    const semanticNodeFileCandidate = `docs/ai-paths/semantic-grammar/nodes/${nodeType}.json`;
    const semanticNodeFile = fs.existsSync(path.join(workspaceRoot, semanticNodeFileCandidate))
      ? semanticNodeFileCandidate
      : 'src/shared/lib/ai-paths/core/docs/node-docs.ts';
    const semanticNodeHash = semanticHashByNodeType.get(nodeType) ?? null;
    const migrationDocFile = `docs/ai-paths/node-code-objects-v3/nodes/${nodeType}.md`;
    const v3Entry = v3IndexEntryByNodeType.get(nodeType);
    const v2ObjectFile = v2Info?.objectFile ?? `docs/ai-paths/node-code-objects-v2/${nodeType}.json`;
    const hasV2ObjectContract = fs.existsSync(path.join(workspaceRoot, v2ObjectFile));
    const parityEvidenceSuiteIds = parityEvidenceSummary.suiteIdsByNodeType[nodeType] ?? [];
    const rolloutApproved = isPilot && rolloutApprovedNodeTypeSet.has(nodeType);
    const migrationChecklistTemplate = {
      semanticContractReviewed: Boolean(semanticNodeFile),
      v3CodeObjectAuthored: isPilot && Boolean(scaffoldFile),
      dualRunParityValidated: parityEvidenceSuiteIds.length > 0,
      rolloutApproved,
    } as const;
    const migrationReadiness = computeNodeMigrationReadiness({
      runtimeStrategy,
      hasSemanticContractHash: Boolean(semanticNodeHash),
      hasV2ObjectContract,
      hasV3Scaffold: Boolean(scaffoldFile),
      hasV3ObjectArtifacts: Boolean(v3Entry?.objectId && v3Entry.objectHash),
      checklist: migrationChecklistTemplate,
    });

    return {
      nodeType,
      title: doc.title,
      nodeFamily: v2Info?.nodeFamily ?? 'general',
      runtimeStrategy,
      migrationWave: isPilot ? 'pilot' : 'backlog',
      codeObjectId: isPilot ? buildCodeObjectId(nodeType) : null,
      ports: {
        inputs: doc.inputs,
        outputs: doc.outputs,
      },
      configFieldCount: doc.config.length,
      docs: {
        semanticNodeFile,
        semanticNodeHash,
        v2ObjectFile,
        v3ScaffoldFile: scaffoldFile,
        v3ObjectId: isPilot ? v3Entry?.objectId ?? null : null,
        v3ObjectHash: isPilot ? v3Entry?.objectHash ?? null : null,
        migrationDocFile,
      },
      migrationChecklistTemplate,
      parityEvidenceSuiteIds,
      migrationReadiness,
    };
  });

const strategyTotals = rows.reduce(
  (accumulator, row) => {
    accumulator[row.runtimeStrategy] += 1;
    return accumulator;
  },
  {
    legacy_adapter: 0,
    code_object_v3: 0,
  }
);

const familyTotalMap = new Map<
  string,
  {
    total: number;
    legacy_adapter: number;
    code_object_v3: number;
  }
>();
for (const row of rows) {
  const entry = familyTotalMap.get(row.nodeFamily) ?? {
    total: 0,
    legacy_adapter: 0,
    code_object_v3: 0,
  };
  entry.total += 1;
  entry[row.runtimeStrategy] += 1;
  familyTotalMap.set(row.nodeFamily, entry);
}

const familyTotals = Array.from(familyTotalMap.entries())
  .map(([nodeFamily, totals]) => ({
    nodeFamily,
    total: totals.total,
    legacy_adapter: totals.legacy_adapter,
    code_object_v3: totals.code_object_v3,
  }))
  .sort((left, right) => left.nodeFamily.localeCompare(right.nodeFamily));

const generatedAt = resolveDocsGeneratedAt();
const readinessSummary = summarizeNodeMigrationReadiness(
  rows.map((row) => row.migrationReadiness)
);

const payload: NodeMigrationIndexPayload = {
  schemaVersion: 'ai-paths.node-migration-doc-index.v2',
  generatedAt,
  totalNodes: rows.length,
  pilotNodeTypes,
  strategyTotals,
  v3ContractsHash,
  readiness: {
    averageScore: readinessSummary.averageScore,
    totalsByStage: readinessSummary.totalsByStage,
    topBlockers: readinessSummary.blockers,
  },
  parityEvidence: {
    sourceFile: parityEvidenceSummary.sourceFile,
    schemaVersion: parityEvidenceSummary.schemaVersion,
    generatedAt: parityEvidenceSummary.generatedAt,
    suiteCount: parityEvidenceSummary.suiteCount,
    suiteIds: parityEvidenceSummary.suiteIds,
    validatedNodeTypes: parityEvidenceSummary.validatedNodeTypes,
  },
  rolloutApprovals: {
    sourceFile: rolloutApprovalsSummary.sourceFile,
    schemaVersion: rolloutApprovalsSummary.schemaVersion,
    generatedAt: rolloutApprovalsSummary.generatedAt,
    approvedNodeTypes: rolloutApprovalsSummary.approvedNodeTypes,
    approvedCount: rolloutApprovalsSummary.approvedNodeTypes.length,
  },
  familyTotals,
  nodes: rows,
};

fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(perNodeDocsDir, { recursive: true });

for (const entry of fs.readdirSync(perNodeDocsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
  fs.unlinkSync(path.join(perNodeDocsDir, entry.name));
}

for (const row of rows) {
  const inputPortLines =
    row.ports.inputs.length > 0
      ? row.ports.inputs.map((port: string) => `- \`${port}\``)
      : ['- (none)'];
  const outputPortLines =
    row.ports.outputs.length > 0
      ? row.ports.outputs.map((port: string) => `- \`${port}\``)
      : ['- (none)'];
  const rowSheetLines = [
    `# ${row.title} Migration Sheet (\`${row.nodeType}\`)`,
    '',
    `Generated at: ${payload.generatedAt}`,
    '',
    '## Status',
    '',
    `- Runtime strategy: \`${row.runtimeStrategy}\``,
    `- Migration wave: \`${row.migrationWave}\``,
    `- Code object ID: ${row.codeObjectId ? `\`${row.codeObjectId}\`` : '`not_assigned`'}`,
    `- Readiness stage: \`${row.migrationReadiness.stage}\``,
    `- Readiness score: ${row.migrationReadiness.score}/100`,
    `- Readiness blockers: ${
      row.migrationReadiness.blockers.length > 0
        ? row.migrationReadiness.blockers.map((blocker) => `\`${blocker}\``).join(', ')
        : '`none`'
    }`,
    `- Parity evidence suite IDs: ${
      row.parityEvidenceSuiteIds.length > 0
        ? row.parityEvidenceSuiteIds.map((suiteId) => `\`${suiteId}\``).join(', ')
        : '`none`'
    }`,
    `- Rollout approved: ${row.migrationChecklistTemplate.rolloutApproved ? '`yes`' : '`no`'} (source: \`${payload.rolloutApprovals.sourceFile}\`)`,
    `- Config field count: ${row.configFieldCount}`,
    '',
    '## Node Contract Files',
    '',
    `- Semantic node contract: \`${row.docs.semanticNodeFile}\``,
    `- Semantic hash: ${row.docs.semanticNodeHash ? `\`${row.docs.semanticNodeHash}\`` : '`missing`'}`,
    `- v2 code object: \`${row.docs.v2ObjectFile}\``,
    `- v3 scaffold: ${row.docs.v3ScaffoldFile ? `\`${row.docs.v3ScaffoldFile}\`` : '`missing`'}`,
    `- v3 object id: ${row.docs.v3ObjectId ? `\`${row.docs.v3ObjectId}\`` : '`missing`'}`,
    `- v3 object hash: ${row.docs.v3ObjectHash ? `\`${row.docs.v3ObjectHash}\`` : '`missing`'}`,
    '',
    '## Ports',
    '',
    'Inputs:',
    ...inputPortLines,
    '',
    'Outputs:',
    ...outputPortLines,
    '',
    '## Migration Checklist',
    '',
    '- [ ] Semantic contract reviewed against UI config fields.',
    '- [ ] v3 scaffold authored or updated for this node.',
    '- [ ] Dual-run parity validated (`legacy_adapter` vs `code_object_v3`).',
    '- [ ] Runtime kernel pilot list updated when rollout is approved.',
    '- [ ] Observability and regression checks reviewed post-rollout.',
    '',
    '## Notes',
    '',
    '- Capture node-specific edge cases, known incompatibilities, and rollout guardrails here.',
    '',
  ];

  const rowSheetPath = path.join(workspaceRoot, row.docs.migrationDocFile);
  fs.mkdirSync(path.dirname(rowSheetPath), { recursive: true });
  fs.writeFileSync(rowSheetPath, `${rowSheetLines.join('\n')}\n`, 'utf8');
}

fs.writeFileSync(outputIndexPath, stableJson(payload), 'utf8');

const familyTableLines = [
  '| Node Family | Total | `legacy_adapter` | `code_object_v3` |',
  '| --- | ---: | ---: | ---: |',
  ...familyTotals.map(
    (entry) =>
      `| ${entry.nodeFamily} | ${entry.total} | ${entry.legacy_adapter} | ${entry.code_object_v3} |`
  ),
];

const nodeTableLines = [
  '| Node Type | Family | Runtime Strategy | Ports (in/out) | Scaffold | Sheet | Semantic Hash | v3 Object Hash |',
  '| --- | --- | --- | ---: | --- | --- | --- | --- |',
  ...rows.map((row) => {
    const scaffold = row.docs.v3ScaffoldFile ? '`yes`' : '`no`';
    const sheet = `[sheet](./nodes/${row.nodeType}.md)`;
    const semanticHash = row.docs.semanticNodeHash ? `\`${row.docs.semanticNodeHash.slice(0, 12)}...\`` : '`missing`';
    const v3ObjectHash = row.docs.v3ObjectHash ? `\`${row.docs.v3ObjectHash.slice(0, 12)}...\`` : '`n/a`';
    return `| \`${row.nodeType}\` | ${row.nodeFamily} | \`${row.runtimeStrategy}\` | ${row.ports.inputs.length}/${row.ports.outputs.length} | ${scaffold} | ${sheet} | ${semanticHash} | ${v3ObjectHash} |`;
  }),
];

const readinessTableLines = [
  '| Stage | Nodes |',
  '| --- | ---: |',
  ...Object.entries(readinessSummary.totalsByStage).map(
    ([stage, count]) => `| \`${stage}\` | ${count} |`
  ),
];

const blockerTableLines =
  readinessSummary.blockers.length > 0
    ? [
        '| Blocker | Nodes |',
        '| --- | ---: |',
        ...readinessSummary.blockers.map((entry) => `| \`${entry.code}\` | ${entry.count} |`),
      ]
    : ['No migration blockers detected.'];

const guideLines = [
  '# Node Migration Guide (Semantic Portable Engine)',
  '',
  'This guide tracks node-by-node migration from legacy runtime handlers to semantic portable code objects (`v3`).',
  '',
  `Generated at: ${payload.generatedAt}`,
  '',
  '## Inputs',
  '',
  '- `src/shared/lib/ai-paths/core/docs/node-docs.ts` (node catalog)',
  '- `src/shared/lib/ai-paths/core/runtime/node-runtime-kernel.ts` (pilot runtime strategy)',
  '- `docs/ai-paths/semantic-grammar/nodes/index.json` (semantic hashes)',
  '- `docs/ai-paths/node-code-objects-v2/index.json` (node-family metadata)',
  '- `docs/ai-paths/node-code-objects-v3/index.scaffold.json` (available v3 scaffolds)',
  '- `docs/ai-paths/node-code-objects-v3/index.json` + `contracts.json` (pilot v3 object hashes)',
  '- `docs/ai-paths/node-code-objects-v3/parity-evidence.json` (dual-run parity evidence)',
  '- `docs/ai-paths/node-code-objects-v3/rollout-approvals.json` (manual rollout approvals)',
  '',
  '## Migration Workflow',
  '',
  '1. Confirm semantic contract for the node (`semantic-grammar/nodes/<nodeType>.json`).',
  '2. Author/refresh `node-code-objects-v3/<nodeType>.scaffold.json` with runtime kernel metadata.',
  '3. Keep runtime strategy on `legacy_adapter` until parity validation passes.',
  '4. Validate dual-run parity (`legacy_adapter` vs `code_object_v3`) with integration coverage.',
  '5. Move node type to kernel pilot list (`NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES`).',
  '6. After rollout and observability sign-off, keep docs/checks green in CI.',
  '',
  '## Strategy Totals',
  '',
  `- Total node types: ${payload.totalNodes}`,
  `- \`legacy_adapter\`: ${payload.strategyTotals.legacy_adapter}`,
  `- \`code_object_v3\`: ${payload.strategyTotals.code_object_v3}`,
  `- v3 contracts hash: ${payload.v3ContractsHash ? `\`${payload.v3ContractsHash}\`` : '`missing`'}`,
  '',
  '## Readiness Scorecard',
  '',
  `- Average readiness score: ${payload.readiness.averageScore}/100`,
  '',
  ...readinessTableLines,
  '',
  '## Parity Evidence',
  '',
  `- Source file: \`${payload.parityEvidence.sourceFile}\``,
  `- Schema version: ${payload.parityEvidence.schemaVersion ? `\`${payload.parityEvidence.schemaVersion}\`` : '`missing`'}`,
  `- Generated at: ${payload.parityEvidence.generatedAt ? `\`${payload.parityEvidence.generatedAt}\`` : '`missing`'}`,
  `- Evidence suites: ${payload.parityEvidence.suiteCount}`,
  `- Validated node types: ${
    payload.parityEvidence.validatedNodeTypes.length > 0
      ? payload.parityEvidence.validatedNodeTypes.map((nodeType) => `\`${nodeType}\``).join(', ')
      : '`none`'
  }`,
  '',
  '## Rollout Approvals',
  '',
  `- Source file: \`${payload.rolloutApprovals.sourceFile}\``,
  `- Schema version: ${payload.rolloutApprovals.schemaVersion ? `\`${payload.rolloutApprovals.schemaVersion}\`` : '`missing`'}`,
  `- Generated at: ${payload.rolloutApprovals.generatedAt ? `\`${payload.rolloutApprovals.generatedAt}\`` : '`missing`'}`,
  `- Approved node types: ${
    payload.rolloutApprovals.approvedNodeTypes.length > 0
      ? payload.rolloutApprovals.approvedNodeTypes.map((nodeType) => `\`${nodeType}\``).join(', ')
      : '`none`'
  }`,
  '',
  'Top blockers:',
  '',
  ...blockerTableLines,
  '',
  '## Family Coverage',
  '',
  ...familyTableLines,
  '',
  '## Node Coverage Matrix',
  '',
  ...nodeTableLines,
  '',
  '## Per-Node Sheets',
  '',
  '- Directory: `docs/ai-paths/node-code-objects-v3/nodes/*.md`',
  '- One migration sheet is generated for every node type in `AI_PATHS_NODE_DOCS`.',
  '',
  '## Generated Artifacts',
  '',
  '- `docs/ai-paths/node-code-objects-v3/index.json`',
  '- `docs/ai-paths/node-code-objects-v3/contracts.json`',
  '- `docs/ai-paths/node-code-objects-v3/migration-index.json`',
  '- `docs/ai-paths/node-code-objects-v3/MIGRATION_GUIDE.md`',
  '- `docs/ai-paths/node-code-objects-v3/nodes/<nodeType>.md`',
  '',
  '## Artifact Hygiene',
  '',
  '- Semantic/v2 generators prune stale per-node JSON files not represented in `AI_PATHS_NODE_DOCS`.',
  '- v3 generator prunes stale `*.scaffold.json` files outside the active pilot set.',
  '- Semantic/v2/v3 checks fail fast when unexpected node/scaffold files are present.',
  '',
  'Regenerate with:',
  '',
  '```bash',
  'npm run docs:ai-paths:node-migration:generate',
  '```',
  '',
  'Validate with:',
  '',
  '```bash',
  'npm run docs:ai-paths:node-migration:check',
  '```',
  '',
];

fs.writeFileSync(outputGuidePath, `${guideLines.join('\n')}\n`, 'utf8');

console.log(`Generated AI-Paths node migration docs for ${rows.length} node types.`);
