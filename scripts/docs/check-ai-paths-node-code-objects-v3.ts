import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES } from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';
import { listUnexpectedFilesBySuffix } from './artifact-hygiene';

type NodeCodeObjectV3IndexScaffold = {
  schemaVersion: string;
  generatedAt: string;
  strategy: string;
  totalObjects: number;
  objects: Array<{
    nodeType: string;
    objectFile: string;
  }>;
};

type NodeCodeObjectV3Index = {
  schemaVersion: string;
  generatedAt: string;
  specVersion: string;
  totalObjects: number;
  pilotNodeTypes: string[];
  objects: Array<{
    id: string;
    nodeType: string;
    title: string;
    objectFile: string;
    objectHashAlgorithm: string;
    objectHash: string;
    runtimeStrategy: string;
    executionAdapter: string;
    legacyHandlerKey: string;
    codeObjectId: string;
  }>;
};

type NodeCodeObjectV3Contracts = {
  schemaVersion: string;
  generatedAt: string;
  specVersion: string;
  totalContracts: number;
  contracts: Record<
    string,
    {
      objectId: string;
      title: string;
      objectHashAlgorithm: string;
      objectHash: string;
      runtimeStrategy: string;
      executionAdapter: string;
      legacyHandlerKey: string;
      codeObjectId: string;
    }
  >;
  contractsHashAlgorithm: string;
  contractsHash: string;
};

type NodeCodeObjectV3Scaffold = {
  schemaVersion: string;
  kind: string;
  specVersion: string;
  generatedAt?: string;
  id: string;
  nodeType: string;
  title: string;
  runtimeKernel?: Record<string, unknown>;
  objectHashAlgorithm: string;
  objectHash: string;
  [key: string]: unknown;
};

const workspaceRoot = process.cwd();
const outputDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v3');
const indexScaffoldPath = path.join(outputDir, 'index.scaffold.json');
const indexPath = path.join(outputDir, 'index.json');
const contractsPath = path.join(outputDir, 'contracts.json');

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

const isSha256Hex = (value: string): boolean => /^[a-f0-9]{64}$/i.test(value);

const toSafeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';
const ALLOWED_EXECUTION_ADAPTERS = new Set<string>([
  'legacy_handler_bridge',
  'native_handler_registry',
]);

const pilotNodeTypes = Array.from(
  new Set(
    NODE_RUNTIME_KERNEL_V3_PILOT_NODE_TYPES.map((entry: string): string =>
      typeof entry === 'string' ? entry.trim() : ''
    ).filter(Boolean)
  )
).sort((left, right) => left.localeCompare(right));
const pilotNodeTypeSet = new Set<string>(pilotNodeTypes);

const errors: string[] = [];
const legacyAdapterNodeTypes: string[] = [];

const unexpectedScaffoldFiles = listUnexpectedFilesBySuffix({
  directoryPath: outputDir,
  suffix: '.scaffold.json',
  expectedBaseNames: pilotNodeTypeSet,
  excludedFileNames: ['index.scaffold.json'],
});

if (!fs.existsSync(indexScaffoldPath)) {
  console.error(`Missing v3 index scaffold: ${path.relative(workspaceRoot, indexScaffoldPath)}`);
  process.exit(1);
}
if (!fs.existsSync(indexPath)) {
  console.error(`Missing v3 index: ${path.relative(workspaceRoot, indexPath)}`);
  process.exit(1);
}
if (!fs.existsSync(contractsPath)) {
  console.error(`Missing v3 contracts: ${path.relative(workspaceRoot, contractsPath)}`);
  process.exit(1);
}

let indexScaffold: NodeCodeObjectV3IndexScaffold;
try {
  indexScaffold = JSON.parse(fs.readFileSync(indexScaffoldPath, 'utf8')) as NodeCodeObjectV3IndexScaffold;
} catch (error) {
  console.error(
    `Failed to parse v3 index scaffold: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

let indexPayload: NodeCodeObjectV3Index;
try {
  indexPayload = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as NodeCodeObjectV3Index;
} catch (error) {
  console.error(`Failed to parse v3 index: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

let contractsPayload: NodeCodeObjectV3Contracts;
try {
  contractsPayload = JSON.parse(fs.readFileSync(contractsPath, 'utf8')) as NodeCodeObjectV3Contracts;
} catch (error) {
  console.error(
    `Failed to parse v3 contracts: ${error instanceof Error ? error.message : 'unknown_error'}`
  );
  process.exit(1);
}

if (indexScaffold.schemaVersion !== 'ai-paths.node-code-object-index.v3-scaffold') {
  errors.push('index.scaffold.json schemaVersion must be "ai-paths.node-code-object-index.v3-scaffold".');
}
if (indexScaffold.strategy !== 'code_object_v3') {
  errors.push('index.scaffold.json strategy must be "code_object_v3".');
}
if (indexPayload.schemaVersion !== 'ai-paths.node-code-object-index.v3') {
  errors.push('index.json schemaVersion must be "ai-paths.node-code-object-index.v3".');
}
if (indexPayload.specVersion !== 'ai-paths.portable-engine.v1') {
  errors.push('index.json specVersion must be "ai-paths.portable-engine.v1".');
}
if (contractsPayload.schemaVersion !== 'ai-paths.node-code-object-contracts.v3') {
  errors.push('contracts.json schemaVersion must be "ai-paths.node-code-object-contracts.v3".');
}
if (contractsPayload.specVersion !== 'ai-paths.portable-engine.v1') {
  errors.push('contracts.json specVersion must be "ai-paths.portable-engine.v1".');
}
if (contractsPayload.contractsHashAlgorithm !== 'sha256') {
  errors.push('contracts.json contractsHashAlgorithm must be "sha256".');
}
if (!isSha256Hex(contractsPayload.contractsHash)) {
  errors.push('contracts.json contractsHash must be a sha256 hex string.');
} else {
  const hashSource = { ...contractsPayload } as Record<string, unknown>;
  delete hashSource['contractsHash'];
  const computedHash = computeHash(hashSource);
  if (computedHash !== contractsPayload.contractsHash) {
    errors.push('contracts.json contractsHash mismatch.');
  }
}

const scaffoldRows = Array.isArray(indexScaffold.objects) ? indexScaffold.objects : [];
const indexRows = Array.isArray(indexPayload.objects) ? indexPayload.objects : [];

if (indexScaffold.totalObjects !== scaffoldRows.length) {
  errors.push(
    `index.scaffold.json totalObjects mismatch (declared=${indexScaffold.totalObjects}, actual=${scaffoldRows.length}).`
  );
}
if (indexPayload.totalObjects !== indexRows.length) {
  errors.push(
    `index.json totalObjects mismatch (declared=${indexPayload.totalObjects}, actual=${indexRows.length}).`
  );
}
if (contractsPayload.totalContracts !== Object.keys(contractsPayload.contracts ?? {}).length) {
  errors.push(
    `contracts.json totalContracts mismatch (declared=${contractsPayload.totalContracts}, actual=${Object.keys(contractsPayload.contracts ?? {}).length}).`
  );
}

const scaffoldNodeTypes = new Set<string>();
for (const row of scaffoldRows) {
  const nodeType = toSafeString(row?.nodeType);
  const objectFile = toSafeString(row?.objectFile);
  if (!nodeType) {
    errors.push('index.scaffold.json row has empty nodeType.');
    continue;
  }
  if (scaffoldNodeTypes.has(nodeType)) {
    errors.push(`Duplicate nodeType in index.scaffold.json: ${nodeType}`);
    continue;
  }
  scaffoldNodeTypes.add(nodeType);

  if (!pilotNodeTypeSet.has(nodeType)) {
    errors.push(`index.scaffold.json has unexpected nodeType=${nodeType}.`);
  }

  const expectedObjectFile = `docs/ai-paths/node-code-objects-v3/${nodeType}.scaffold.json`;
  if (objectFile !== expectedObjectFile) {
    errors.push(
      `${nodeType}: index.scaffold.json objectFile mismatch (expected=${expectedObjectFile}, actual=${objectFile}).`
    );
  }
}

for (const pilotNodeType of pilotNodeTypes) {
  if (!scaffoldNodeTypes.has(pilotNodeType)) {
    errors.push(`index.scaffold.json missing pilot nodeType=${pilotNodeType}.`);
  }
}

const declaredPilotTypes = new Set<string>((indexPayload.pilotNodeTypes ?? []).map(toSafeString).filter(Boolean));
for (const pilotNodeType of pilotNodeTypes) {
  if (!declaredPilotTypes.has(pilotNodeType)) {
    errors.push(`index.json missing pilotNodeType=${pilotNodeType}.`);
  }
}
for (const declared of declaredPilotTypes) {
  if (!pilotNodeTypeSet.has(declared)) {
    errors.push(`index.json has unexpected pilotNodeType=${declared}.`);
  }
}

const seenIndexNodeTypes = new Set<string>();
for (const row of indexRows) {
  const nodeType = toSafeString(row?.nodeType);
  if (!nodeType) {
    errors.push('index.json row has empty nodeType.');
    continue;
  }
  if (seenIndexNodeTypes.has(nodeType)) {
    errors.push(`Duplicate nodeType in index.json: ${nodeType}`);
    continue;
  }
  seenIndexNodeTypes.add(nodeType);

  if (!pilotNodeTypeSet.has(nodeType)) {
    errors.push(`index.json has unexpected nodeType=${nodeType}.`);
  }

  const objectFile = toSafeString(row.objectFile);
  const expectedObjectFile = `docs/ai-paths/node-code-objects-v3/${nodeType}.scaffold.json`;
  if (objectFile !== expectedObjectFile) {
    errors.push(`${nodeType}: index.json objectFile mismatch (expected=${expectedObjectFile}, actual=${objectFile}).`);
  }

  if (row.objectHashAlgorithm !== 'sha256') {
    errors.push(`${nodeType}: index.json objectHashAlgorithm must be "sha256".`);
  }
  if (!isSha256Hex(toSafeString(row.objectHash))) {
    errors.push(`${nodeType}: index.json objectHash must be sha256 hex.`);
  }
  if (row.runtimeStrategy !== 'code_object_v3') {
    errors.push(`${nodeType}: index.json runtimeStrategy must be "code_object_v3".`);
  }
  if (toSafeString(row.legacyHandlerKey) !== nodeType) {
    errors.push(`${nodeType}: index.json legacyHandlerKey must match nodeType.`);
  }
  if (toSafeString(row.codeObjectId) !== `ai-paths.node-code-object.${nodeType}.v3`) {
    errors.push(`${nodeType}: index.json codeObjectId mismatch.`);
  }

  const objectPath = path.join(workspaceRoot, objectFile);
  if (!fs.existsSync(objectPath)) {
    errors.push(`${nodeType}: scaffold object file missing (${objectFile}).`);
    continue;
  }

  let scaffoldObject: NodeCodeObjectV3Scaffold;
  try {
    scaffoldObject = JSON.parse(fs.readFileSync(objectPath, 'utf8')) as NodeCodeObjectV3Scaffold;
  } catch (error) {
    errors.push(
      `${nodeType}: scaffold object JSON parse failed (${
        error instanceof Error ? error.message : 'unknown_error'
      }).`
    );
    continue;
  }

  if (scaffoldObject.schemaVersion !== 'ai-paths.node-code-object.v3') {
    errors.push(`${nodeType}: scaffold schemaVersion must be "ai-paths.node-code-object.v3".`);
  }
  if (scaffoldObject.kind !== 'path_node_code_object') {
    errors.push(`${nodeType}: scaffold kind must be "path_node_code_object".`);
  }
  if (scaffoldObject.specVersion !== 'ai-paths.portable-engine.v1') {
    errors.push(`${nodeType}: scaffold specVersion must be "ai-paths.portable-engine.v1".`);
  }
  if (toSafeString(scaffoldObject.nodeType) !== nodeType) {
    errors.push(`${nodeType}: scaffold nodeType mismatch.`);
  }
  if (scaffoldObject.objectHashAlgorithm !== 'sha256') {
    errors.push(`${nodeType}: scaffold objectHashAlgorithm must be "sha256".`);
  }
  if (!isSha256Hex(toSafeString(scaffoldObject.objectHash))) {
    errors.push(`${nodeType}: scaffold objectHash must be sha256 hex.`);
  } else {
    const hashSource = { ...scaffoldObject } as Record<string, unknown>;
    delete hashSource['objectHash'];
    const computedObjectHash = computeHash(hashSource);
    if (computedObjectHash !== scaffoldObject.objectHash) {
      errors.push(`${nodeType}: scaffold objectHash mismatch.`);
    }
    if (row.objectHash !== scaffoldObject.objectHash) {
      errors.push(`${nodeType}: index.json objectHash mismatch scaffold hash.`);
    }
  }

  const runtimeKernel = scaffoldObject.runtimeKernel ?? {};
  const runtimeStrategy = toSafeString(runtimeKernel['strategy']);
  const executionAdapter = toSafeString(runtimeKernel['executionAdapter']);
  const legacyHandlerKey = toSafeString(runtimeKernel['legacyHandlerKey']);
  const codeObjectId = toSafeString(runtimeKernel['codeObjectId']);

  if (runtimeStrategy !== 'code_object_v3') {
    errors.push(`${nodeType}: scaffold runtimeKernel.strategy must be "code_object_v3".`);
  }
  if (!executionAdapter) {
    errors.push(`${nodeType}: scaffold runtimeKernel.executionAdapter must be non-empty.`);
  } else if (!ALLOWED_EXECUTION_ADAPTERS.has(executionAdapter)) {
    errors.push(
      `${nodeType}: scaffold runtimeKernel.executionAdapter must be one of ${Array.from(ALLOWED_EXECUTION_ADAPTERS).join(', ')}.`
    );
  } else if (executionAdapter === 'legacy_handler_bridge') {
    legacyAdapterNodeTypes.push(nodeType);
  }
  if (legacyHandlerKey !== nodeType) {
    errors.push(`${nodeType}: scaffold runtimeKernel.legacyHandlerKey must match nodeType.`);
  }
  if (codeObjectId !== `ai-paths.node-code-object.${nodeType}.v3`) {
    errors.push(`${nodeType}: scaffold runtimeKernel.codeObjectId mismatch.`);
  }

  const contractEntry = contractsPayload.contracts?.[nodeType];
  if (!contractEntry) {
    errors.push(`${nodeType}: contracts.json missing contract entry.`);
    continue;
  }
  if (contractEntry.objectHashAlgorithm !== 'sha256') {
    errors.push(`${nodeType}: contracts.json objectHashAlgorithm must be "sha256".`);
  }
  if (contractEntry.objectHash !== scaffoldObject.objectHash) {
    errors.push(`${nodeType}: contracts.json objectHash mismatch.`);
  }
  if (toSafeString(contractEntry.objectId) !== toSafeString(scaffoldObject.id)) {
    errors.push(`${nodeType}: contracts.json objectId mismatch.`);
  }
  if (contractEntry.runtimeStrategy !== 'code_object_v3') {
    errors.push(`${nodeType}: contracts.json runtimeStrategy must be "code_object_v3".`);
  }
  const contractExecutionAdapter = toSafeString(contractEntry.executionAdapter);
  if (!ALLOWED_EXECUTION_ADAPTERS.has(contractExecutionAdapter)) {
    errors.push(
      `${nodeType}: contracts.json executionAdapter must be one of ${Array.from(ALLOWED_EXECUTION_ADAPTERS).join(', ')}.`
    );
  }
  if (contractExecutionAdapter !== executionAdapter) {
    errors.push(`${nodeType}: contracts.json executionAdapter mismatch.`);
  }
  if (toSafeString(contractEntry.legacyHandlerKey) !== nodeType) {
    errors.push(`${nodeType}: contracts.json legacyHandlerKey must match nodeType.`);
  }
  if (toSafeString(contractEntry.codeObjectId) !== `ai-paths.node-code-object.${nodeType}.v3`) {
    errors.push(`${nodeType}: contracts.json codeObjectId mismatch.`);
  }
}

for (const pilotNodeType of pilotNodeTypes) {
  if (!seenIndexNodeTypes.has(pilotNodeType)) {
    errors.push(`index.json missing pilot nodeType=${pilotNodeType}.`);
  }
}

const contractNodeTypes = new Set<string>(Object.keys(contractsPayload.contracts ?? {}));
for (const contractNodeType of contractNodeTypes) {
  if (!pilotNodeTypeSet.has(contractNodeType)) {
    errors.push(`contracts.json has unexpected nodeType=${contractNodeType}.`);
  }
}
for (const pilotNodeType of pilotNodeTypes) {
  if (!contractNodeTypes.has(pilotNodeType)) {
    errors.push(`contracts.json missing pilot nodeType=${pilotNodeType}.`);
  }
}

if (unexpectedScaffoldFiles.length > 0) {
  errors.push(
    `Unexpected scaffold files in docs/ai-paths/node-code-objects-v3: ${unexpectedScaffoldFiles.join(', ')}`
  );
}
if (legacyAdapterNodeTypes.length > 0) {
  errors.push(
    `All v3 pilot node contracts must use native_handler_registry. Legacy adapters found for: ${legacyAdapterNodeTypes
      .sort((left, right) => left.localeCompare(right))
      .join(', ')}`
  );
}

if (errors.length > 0) {
  console.error('AI-Paths node code object v3 check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`AI-Paths node code object v3 check passed for ${pilotNodeTypes.length} pilot node type(s).`);
