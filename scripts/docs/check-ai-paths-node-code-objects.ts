import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';

type NodeObjectIndex = {
  schemaVersion: string;
  generatedAt: string;
  totalObjects: number;
  objects: Array<{
    nodeType: string;
    objectFile: string;
    objectHashAlgorithm: string;
    objectHash: string;
  }>;
};

type NodeObjectContracts = {
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
    }
  >;
  contractsHashAlgorithm: string;
  contractsHash: string;
};

type PortableNodeObject = {
  schemaVersion: string;
  kind: string;
  nodeType: string;
  ports: {
    inputs: unknown[];
    outputs: unknown[];
  };
  statusModel: Record<string, unknown>;
  runtimeSemantics: Record<string, unknown>;
  configContract: {
    fields: unknown[];
  };
  copyPaste: {
    minimalNode: Record<string, unknown>;
    fullNode: Record<string, unknown>;
    pathSnippet: {
      nodes: unknown[];
      edges: unknown[];
    };
  };
  objectHashAlgorithm: string;
  objectHash: string;
};

const workspaceRoot = process.cwd();
const objectsDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v2');
const indexPath = path.join(objectsDir, 'index.json');
const contractsPath = path.join(objectsDir, 'contracts.json');

const normalizeForHashing = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeForHashing(entry));
  }
  if (value && typeof value === 'object') {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeForHashing(entry)] as const);
    return Object.fromEntries(sortedEntries);
  }
  return value;
};

const computeHash = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(normalizeForHashing(value)), 'utf8')
    .digest('hex');

const expectedNodeTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));
const errors: string[] = [];

if (!fs.existsSync(indexPath)) {
  console.error(`Missing node object index: ${path.relative(workspaceRoot, indexPath)}`);
  process.exit(1);
}
if (!fs.existsSync(contractsPath)) {
  console.error(`Missing node object contracts: ${path.relative(workspaceRoot, contractsPath)}`);
  process.exit(1);
}

let index: NodeObjectIndex;
try {
  index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as NodeObjectIndex;
} catch (error) {
  console.error(`Failed to parse node object index: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

let contracts: NodeObjectContracts;
try {
  contracts = JSON.parse(fs.readFileSync(contractsPath, 'utf8')) as NodeObjectContracts;
} catch (error) {
  console.error(`Failed to parse node object contracts: ${error instanceof Error ? error.message : 'unknown_error'}`);
  process.exit(1);
}

if (index.schemaVersion !== 'ai-paths.node-code-object-index.v2') {
  errors.push('index.json schemaVersion must be "ai-paths.node-code-object-index.v2".');
}
if (contracts.schemaVersion !== 'ai-paths.node-code-object-contracts.v2') {
  errors.push('contracts.json schemaVersion must be "ai-paths.node-code-object-contracts.v2".');
}
if (contracts.contractsHashAlgorithm !== 'sha256') {
  errors.push('contracts.json contractsHashAlgorithm must be "sha256".');
}
if (!/^[a-f0-9]{64}$/i.test(contracts.contractsHash)) {
  errors.push('contracts.json contractsHash must be a sha256 hex string.');
} else {
  const hashSource = { ...contracts } as Record<string, unknown>;
  delete hashSource['contractsHash'];
  const computed = computeHash(hashSource);
  if (computed !== contracts.contractsHash) {
    errors.push('contracts.json contractsHash mismatch.');
  }
}

const expectedContractNodeTypes = new Set(Object.keys(contracts.contracts ?? {}));

const seenNodeTypes = new Set<string>();
for (const row of index.objects) {
  const nodeType = row.nodeType.trim();
  if (seenNodeTypes.has(nodeType)) {
    errors.push(`Duplicate nodeType in index.json: ${nodeType}`);
    continue;
  }
  seenNodeTypes.add(nodeType);

  const absoluteObjectPath = path.join(workspaceRoot, row.objectFile);
  if (!fs.existsSync(absoluteObjectPath)) {
    errors.push(`Missing object file for nodeType=${nodeType}: ${row.objectFile}`);
    continue;
  }

  let object: PortableNodeObject;
  try {
    object = JSON.parse(fs.readFileSync(absoluteObjectPath, 'utf8')) as PortableNodeObject;
  } catch (error) {
    errors.push(`${row.objectFile}: invalid JSON (${error instanceof Error ? error.message : 'unknown_error'})`);
    continue;
  }

  if (object.schemaVersion !== 'ai-paths.node-code-object.v2') {
    errors.push(`${row.objectFile}: schemaVersion must be "ai-paths.node-code-object.v2".`);
  }
  if (object.kind !== 'path_node_code_object') {
    errors.push(`${row.objectFile}: kind must be "path_node_code_object".`);
  }
  if (object.nodeType !== nodeType) {
    errors.push(`${row.objectFile}: nodeType mismatch (index=${nodeType}, file=${object.nodeType}).`);
  }
  if (!Array.isArray(object.ports.inputs) || !Array.isArray(object.ports.outputs)) {
    errors.push(`${row.objectFile}: ports.inputs and ports.outputs must be arrays.`);
  }

  const requiredStatuses = ['idle', 'processing', 'waiting', 'success', 'error', 'skipped'];
  for (const status of requiredStatuses) {
    if (!(status in object.statusModel)) {
      errors.push(`${row.objectFile}: missing statusModel.${status}.`);
    }
  }

  if (!Array.isArray(object.configContract.fields)) {
    errors.push(`${row.objectFile}: configContract.fields must be an array.`);
  }

  const fullNodeType = object.copyPaste?.fullNode?.['type'];
  if (fullNodeType !== nodeType) {
    errors.push(`${row.objectFile}: copyPaste.fullNode.type must equal nodeType (${nodeType}).`);
  }

  if (object.objectHashAlgorithm !== 'sha256') {
    errors.push(`${row.objectFile}: objectHashAlgorithm must be "sha256".`);
  }
  const hashSource = { ...object } as Record<string, unknown>;
  delete hashSource['objectHash'];
  const computedHash = computeHash(hashSource);
  if (object.objectHash !== computedHash) {
    errors.push(`${row.objectFile}: objectHash mismatch.`);
  }
  if (row.objectHashAlgorithm !== 'sha256') {
    errors.push(`index.json row for ${nodeType}: objectHashAlgorithm must be "sha256".`);
  }
  if (row.objectHash !== object.objectHash) {
    errors.push(`index.json row for ${nodeType}: objectHash mismatch.`);
  }

  const contractEntry = contracts.contracts?.[nodeType];
  if (!contractEntry) {
    errors.push(`contracts.json missing contract entry for nodeType=${nodeType}.`);
  } else {
    if (contractEntry.objectHashAlgorithm !== 'sha256') {
      errors.push(`contracts.json entry for ${nodeType}: objectHashAlgorithm must be "sha256".`);
    }
    if (contractEntry.objectHash !== object.objectHash) {
      errors.push(`contracts.json entry for ${nodeType}: objectHash mismatch.`);
    }
    if (contractEntry.objectId !== object.id) {
      errors.push(`contracts.json entry for ${nodeType}: objectId mismatch.`);
    }
    if (typeof contractEntry.title !== 'string' || contractEntry.title.trim().length === 0) {
      errors.push(`contracts.json entry for ${nodeType}: title must be non-empty.`);
    }
  }
}

const missingInIndex = [...expectedNodeTypes].filter((type) => !seenNodeTypes.has(type));
if (missingInIndex.length > 0) {
  errors.push(`Missing node types in index.json: ${missingInIndex.join(', ')}`);
}

const unexpectedInIndex = [...seenNodeTypes].filter((type) => !expectedNodeTypes.has(type));
if (unexpectedInIndex.length > 0) {
  errors.push(`Unexpected node types in index.json: ${unexpectedInIndex.join(', ')}`);
}

if (index.totalObjects !== index.objects.length) {
  errors.push(
    `index.json totalObjects mismatch (declared=${index.totalObjects}, actual=${index.objects.length}).`
  );
}
if (contracts.totalContracts !== Object.keys(contracts.contracts ?? {}).length) {
  errors.push(
    `contracts.json totalContracts mismatch (declared=${contracts.totalContracts}, actual=${Object.keys(contracts.contracts ?? {}).length}).`
  );
}
if (contracts.totalContracts !== index.totalObjects) {
  errors.push(
    `contracts.json totalContracts must match index totalObjects (contracts=${contracts.totalContracts}, index=${index.totalObjects}).`
  );
}
const unexpectedContracts = [...expectedContractNodeTypes].filter((type) => !seenNodeTypes.has(type));
if (unexpectedContracts.length > 0) {
  errors.push(`Unexpected node types in contracts.json: ${unexpectedContracts.join(', ')}`);
}

if (errors.length > 0) {
  console.error('AI-Paths node code object v2 check failed:');
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`AI-Paths node code object v2 check passed for ${index.objects.length} node types.`);
