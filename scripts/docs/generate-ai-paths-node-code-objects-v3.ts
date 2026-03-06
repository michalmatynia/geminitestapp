import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import { pruneUnexpectedFilesBySuffix } from './artifact-hygiene';
import { resolveDocsGeneratedAt } from './docs-generated-at';

type NodeCodeObjectV3Scaffold = {
  schemaVersion?: string;
  kind?: string;
  specVersion?: string;
  generatedAt?: string;
  id?: string;
  nodeType?: string;
  title?: string;
  runtimeKernel?: Record<string, unknown>;
  objectHashAlgorithm?: string;
  objectHash?: string;
  [key: string]: unknown;
};

type NodeCodeObjectV3IndexScaffold = {
  schemaVersion: 'ai-paths.node-code-object-index.v3-scaffold';
  generatedAt: string;
  strategy: 'code_object_v3';
  totalObjects: number;
  objects: Array<{
    nodeType: string;
    objectFile: string;
  }>;
};

type NodeCodeObjectV3Index = {
  schemaVersion: 'ai-paths.node-code-object-index.v3';
  generatedAt: string;
  specVersion: 'ai-paths.portable-engine.v1';
  totalObjects: number;
  runtimeKernelNodeTypes: string[];
  objects: Array<{
    id: string;
    nodeType: string;
    title: string;
    objectFile: string;
    objectHashAlgorithm: 'sha256';
    objectHash: string;
    runtimeStrategy: 'code_object_v3';
    executionAdapter: string;
    legacyHandlerKey: string;
    codeObjectId: string;
  }>;
};

type NodeCodeObjectV3Contracts = {
  schemaVersion: 'ai-paths.node-code-object-contracts.v3';
  generatedAt: string;
  specVersion: 'ai-paths.portable-engine.v1';
  totalContracts: number;
  contracts: Record<
    string,
    {
      objectId: string;
      title: string;
      objectHashAlgorithm: 'sha256';
      objectHash: string;
      runtimeStrategy: 'code_object_v3';
      executionAdapter: string;
      legacyHandlerKey: string;
      codeObjectId: string;
    }
  >;
  contractsHashAlgorithm: 'sha256';
  contractsHash: string;
};

const NODE_CODE_OBJECT_V3_SPEC_VERSION = 'ai-paths.portable-engine.v1' as const;

const workspaceRoot = process.cwd();
const outputDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v3');
const indexScaffoldPath = path.join(outputDir, 'index.scaffold.json');
const indexPath = path.join(outputDir, 'index.json');
const contractsPath = path.join(outputDir, 'contracts.json');

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const normalizeForHashing = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((entry) => normalizeForHashing(entry));
  if (value && typeof value === 'object') {
    const sorted = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeForHashing(entry)] as const);
    return Object.fromEntries(sorted);
  }
  return value;
};

const computeHash = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(normalizeForHashing(value)), 'utf8')
    .digest('hex');

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const runtimeKernelNodeTypes = Array.from(
  new Set(
    NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES.map((entry: string): string =>
      typeof entry === 'string' ? entry.trim() : ''
    ).filter(Boolean)
  )
).sort((left, right) => left.localeCompare(right));

if (runtimeKernelNodeTypes.length === 0) {
  console.error(
    'No runtime-kernel node types resolved from NODE_RUNTIME_KERNEL_CANONICAL_NODE_TYPES.'
  );
  process.exit(1);
}

const nodeDocTitleByType = new Map<string, string>(
  AI_PATHS_NODE_DOCS.map((doc) => [doc.type, doc.title] as const)
);

const generatedAt = resolveDocsGeneratedAt();

fs.mkdirSync(outputDir, { recursive: true });

pruneUnexpectedFilesBySuffix({
  directoryPath: outputDir,
  suffix: '.scaffold.json',
  expectedBaseNames: new Set<string>(runtimeKernelNodeTypes),
  excludedFileNames: ['index.scaffold.json'],
});

const indexScaffold: NodeCodeObjectV3IndexScaffold = {
  schemaVersion: 'ai-paths.node-code-object-index.v3-scaffold',
  generatedAt,
  strategy: 'code_object_v3',
  totalObjects: runtimeKernelNodeTypes.length,
  objects: runtimeKernelNodeTypes.map((nodeType: string) => ({
    nodeType,
    objectFile: `docs/ai-paths/node-code-objects-v3/${nodeType}.scaffold.json`,
  })),
};

const indexRows: NodeCodeObjectV3Index['objects'] = [];
const contracts: NodeCodeObjectV3Contracts['contracts'] = {};

for (const row of indexScaffold.objects) {
  const objectFile = row.objectFile;
  const nodeType = row.nodeType;
  const absoluteObjectPath = path.join(workspaceRoot, objectFile);
  if (!fs.existsSync(absoluteObjectPath)) {
    console.error(`Missing v3 scaffold file for nodeType=${nodeType}: ${objectFile}`);
    process.exit(1);
  }

  let scaffold: NodeCodeObjectV3Scaffold;
  try {
    scaffold = JSON.parse(fs.readFileSync(absoluteObjectPath, 'utf8')) as NodeCodeObjectV3Scaffold;
  } catch (error) {
    console.error(
      `Failed to parse scaffold ${objectFile}: ${
        error instanceof Error ? error.message : 'unknown_error'
      }`
    );
    process.exit(1);
  }

  const runtimeKernel = asRecord(scaffold.runtimeKernel);
  const codeObjectId =
    toSafeString(runtimeKernel['codeObjectId']) || `ai-paths.node-code-object.${nodeType}.v3`;
  const executionAdapter = toSafeString(runtimeKernel['executionAdapter']) || 'legacy_handler_bridge';
  const legacyHandlerKey = toSafeString(runtimeKernel['legacyHandlerKey']) || nodeType;
  const title = toSafeString(scaffold.title) || nodeDocTitleByType.get(nodeType) || nodeType;
  const objectId = toSafeString(scaffold.id) || `node_obj_${nodeType}_portable_v3`;

  const normalizedScaffold: Record<string, unknown> = {
    ...scaffold,
    schemaVersion: 'ai-paths.node-code-object.v3',
    kind: 'path_node_code_object',
    specVersion: NODE_CODE_OBJECT_V3_SPEC_VERSION,
    generatedAt,
    id: objectId,
    nodeType,
    title,
    runtimeKernel: {
      ...runtimeKernel,
      strategy: 'code_object_v3',
      executionAdapter,
      legacyHandlerKey,
      codeObjectId,
    },
  };

  delete normalizedScaffold['objectHash'];
  normalizedScaffold['objectHashAlgorithm'] = 'sha256';
  normalizedScaffold['objectHash'] = computeHash(normalizedScaffold);

  fs.writeFileSync(absoluteObjectPath, stableJson(normalizedScaffold), 'utf8');

  const objectHash = String(normalizedScaffold['objectHash']);
  indexRows.push({
    id: objectId,
    nodeType,
    title,
    objectFile,
    objectHashAlgorithm: 'sha256',
    objectHash,
    runtimeStrategy: 'code_object_v3',
    executionAdapter,
    legacyHandlerKey,
    codeObjectId,
  });
  contracts[nodeType] = {
    objectId,
    title,
    objectHashAlgorithm: 'sha256',
    objectHash,
    runtimeStrategy: 'code_object_v3',
    executionAdapter,
    legacyHandlerKey,
    codeObjectId,
  };
}

const normalizedIndexRows = [...indexRows].sort((left, right) =>
  left.nodeType.localeCompare(right.nodeType)
);
const normalizedContracts = Object.fromEntries(
  Object.entries(contracts).sort(([left], [right]) => left.localeCompare(right))
) as NodeCodeObjectV3Contracts['contracts'];

const indexPayload: NodeCodeObjectV3Index = {
  schemaVersion: 'ai-paths.node-code-object-index.v3',
  generatedAt,
  specVersion: NODE_CODE_OBJECT_V3_SPEC_VERSION,
  totalObjects: normalizedIndexRows.length,
  runtimeKernelNodeTypes: [...runtimeKernelNodeTypes],
  objects: normalizedIndexRows,
};

const contractsPayload: NodeCodeObjectV3Contracts = {
  schemaVersion: 'ai-paths.node-code-object-contracts.v3',
  generatedAt,
  specVersion: NODE_CODE_OBJECT_V3_SPEC_VERSION,
  totalContracts: Object.keys(normalizedContracts).length,
  contracts: normalizedContracts,
  contractsHashAlgorithm: 'sha256',
  contractsHash: '',
};

const contractsHashSource = { ...contractsPayload } as Record<string, unknown>;
delete contractsHashSource['contractsHash'];
contractsPayload.contractsHash = computeHash(contractsHashSource);

fs.writeFileSync(indexScaffoldPath, stableJson(indexScaffold), 'utf8');
fs.writeFileSync(indexPath, stableJson(indexPayload), 'utf8');
fs.writeFileSync(contractsPath, stableJson(contractsPayload), 'utf8');

console.log(
  `Generated AI-Paths node code object v3 artifacts for ${normalizedIndexRows.length} runtime-kernel node type(s).`
);
