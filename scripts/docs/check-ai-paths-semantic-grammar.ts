import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';

const workspaceRoot = process.cwd();
const nodesDir = path.join(workspaceRoot, 'docs/ai-paths/semantic-grammar/nodes');

const expectedTypes = new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type));
const expectedFiles = Array.from(expectedTypes).map((nodeType) =>
  path.join(nodesDir, `${nodeType}.json`)
);

const normalizeForHashing = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry: unknown): unknown => normalizeForHashing(entry));
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, normalizeForHashing(entry)] as const);
    return Object.fromEntries(entries);
  }
  return value;
};

const computeNodeHash = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(normalizeForHashing(value)), 'utf8')
    .digest('hex');

const missingFiles = expectedFiles.filter((filePath) => !fs.existsSync(filePath));
const indexPath = path.join(nodesDir, 'index.json');

if (missingFiles.length > 0) {
  console.error('Missing semantic node JSON files:');
  for (const filePath of missingFiles) {
    console.error(`- ${path.relative(workspaceRoot, filePath)}`);
  }
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error(`Missing semantic grammar index: ${path.relative(workspaceRoot, indexPath)}`);
  process.exit(1);
}

let parsedIndex: Array<Record<string, unknown>> = [];
try {
  const raw = fs.readFileSync(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('index.json must be an array.');
  }
  parsedIndex = parsed as Array<Record<string, unknown>>;
} catch (error) {
  console.error(`Failed to parse ${indexPath}:`, error);
  process.exit(1);
}

const indexRowsByType = new Map<string, Record<string, unknown>>();
const duplicateIndexTypes: string[] = [];
for (const row of parsedIndex) {
  const rowNodeType = row?.['nodeType'];
  const nodeType = typeof rowNodeType === 'string' ? rowNodeType.trim() : '';
  if (!nodeType) continue;
  if (indexRowsByType.has(nodeType)) {
    duplicateIndexTypes.push(nodeType);
    continue;
  }
  indexRowsByType.set(nodeType, row);
}

const missingFromIndex = Array.from(expectedTypes).filter(
  (nodeType) => !indexRowsByType.has(nodeType)
);

const unexpectedInIndex = Array.from(indexRowsByType.keys()).filter(
  (nodeType) => !expectedTypes.has(nodeType)
);

if (duplicateIndexTypes.length > 0) {
  console.error('Duplicate node types in semantic index:');
  for (const nodeType of duplicateIndexTypes) {
    console.error(`- ${nodeType}`);
  }
  process.exit(1);
}

if (missingFromIndex.length > 0 || unexpectedInIndex.length > 0) {
  if (missingFromIndex.length > 0) {
    console.error('Node types missing in semantic grammar nodes/index.json:');
    for (const nodeType of missingFromIndex) {
      console.error(`- ${nodeType}`);
    }
  }
  if (unexpectedInIndex.length > 0) {
    console.error('Unexpected node types in semantic grammar nodes/index.json:');
    for (const nodeType of unexpectedInIndex) {
      console.error(`- ${nodeType}`);
    }
  }
  process.exit(1);
}

const hashToType = new Map<string, string>();
const hashValidationErrors: string[] = [];

for (const nodeType of Array.from(expectedTypes).sort()) {
  const filePath = path.join(nodesDir, `${nodeType}.json`);
  let parsedDoc: Record<string, unknown>;
  try {
    parsedDoc = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    hashValidationErrors.push(
      `${path.relative(workspaceRoot, filePath)}: invalid JSON (${error instanceof Error ? error.message : 'unknown error'}).`
    );
    continue;
  }

  const declaredNodeTypeRaw = parsedDoc?.['nodeType'];
  const declaredNodeType =
    typeof declaredNodeTypeRaw === 'string' ? declaredNodeTypeRaw.trim() : '';
  if (declaredNodeType !== nodeType) {
    hashValidationErrors.push(
      `${path.relative(workspaceRoot, filePath)}: nodeType mismatch (expected "${nodeType}", got "${declaredNodeType || 'missing'}").`
    );
  }

  const nodeHashRaw = parsedDoc?.['nodeHash'];
  const nodeHash = typeof nodeHashRaw === 'string' ? nodeHashRaw.trim() : '';
  const nodeHashAlgorithmRaw = parsedDoc?.['nodeHashAlgorithm'];
  const nodeHashAlgorithm =
    typeof nodeHashAlgorithmRaw === 'string' ? nodeHashAlgorithmRaw.trim() : '';
  if (!/^[a-f0-9]{64}$/i.test(nodeHash)) {
    hashValidationErrors.push(
      `${path.relative(workspaceRoot, filePath)}: missing or invalid nodeHash.`
    );
    continue;
  }
  if (nodeHashAlgorithm !== 'sha256') {
    hashValidationErrors.push(
      `${path.relative(workspaceRoot, filePath)}: nodeHashAlgorithm must be "sha256".`
    );
    continue;
  }

  const payloadForHash = { ...parsedDoc };
  delete payloadForHash['nodeHash'];
  delete payloadForHash['nodeHashAlgorithm'];
  const computedHash = computeNodeHash(payloadForHash);
  if (computedHash !== nodeHash) {
    hashValidationErrors.push(
      `${path.relative(workspaceRoot, filePath)}: nodeHash mismatch (expected ${computedHash}, got ${nodeHash}).`
    );
  }

  const existingType = hashToType.get(nodeHash);
  if (existingType && existingType !== nodeType) {
    hashValidationErrors.push(
      `nodeHash collision: ${nodeType} and ${existingType} share hash ${nodeHash}.`
    );
  } else {
    hashToType.set(nodeHash, nodeType);
  }

  const indexRow = indexRowsByType.get(nodeType);
  const indexRowHash = indexRow?.['nodeHash'];
  const indexHash = typeof indexRowHash === 'string' ? indexRowHash.trim() : '';
  const indexRowAlgorithm = indexRow?.['nodeHashAlgorithm'];
  const indexAlgorithm = typeof indexRowAlgorithm === 'string' ? indexRowAlgorithm.trim() : '';
  if (indexHash !== nodeHash) {
    hashValidationErrors.push(
      `nodes/index.json (${nodeType}): nodeHash mismatch (expected ${nodeHash}, got ${indexHash || 'missing'}).`
    );
  }
  if (indexAlgorithm !== 'sha256') {
    hashValidationErrors.push(
      `nodes/index.json (${nodeType}): nodeHashAlgorithm must be "sha256".`
    );
  }
}

if (hashValidationErrors.length > 0) {
  console.error('Semantic node hash validation failed:');
  for (const error of hashValidationErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Semantic grammar docs coverage + hash check passed for ${expectedTypes.size} node types.`
);
