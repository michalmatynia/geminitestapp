import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { palette } from '@/shared/lib/ai-paths/core/definitions';
import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { pruneUnexpectedFilesBySuffix } from './artifact-hygiene';

const workspaceRoot = process.cwd();
const semanticDocsDir = path.join(workspaceRoot, 'docs/ai-paths/semantic-grammar');
const nodesDir = path.join(semanticDocsDir, 'nodes');

type NodeDocExportRow = {
  nodeType: string;
  title: string;
  file: string;
  nodeHash: string;
  nodeHashAlgorithm: 'sha256';
  inputCount: number;
  outputCount: number;
  configFieldCount: number;
  runtimeFieldCount: number;
  criticalFieldCount: number;
  hasDefaultConfig: boolean;
  defaultConfigKeyCount: number;
  purposeSummary: string;
};

const resolveDefaultConfig = (nodeType: string): Record<string, unknown> | undefined => {
  const typedWithConfig = palette.find(
    (definition) =>
      definition.type === nodeType && definition.config && typeof definition.config === 'object'
  );
  if (typedWithConfig?.config && typeof typedWithConfig.config === 'object') {
    return typedWithConfig.config as Record<string, unknown>;
  }
  return undefined;
};

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

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

const summarizePurpose = (value: string): string => value.trim().replace(/\s+/g, ' ').slice(0, 140);

const CRITICAL_CONFIG_FIELD_PATTERN =
  /(entityId|collection|modelId|template|event|pattern|queryTemplate|intervalMs|maxAttempts|mappings|url)$/i;

const indexRows: NodeDocExportRow[] = [];

fs.mkdirSync(nodesDir, { recursive: true });

pruneUnexpectedFilesBySuffix({
  directoryPath: nodesDir,
  suffix: '.json',
  expectedBaseNames: new Set<string>(AI_PATHS_NODE_DOCS.map((doc) => doc.type)),
  excludedFileNames: ['index.json'],
});

for (const doc of AI_PATHS_NODE_DOCS) {
  const fileName = `${doc.type}.json`;
  const filePath = path.join(nodesDir, fileName);
  const defaultConfig = resolveDefaultConfig(doc.type);

  const configFields = doc.config.map((field: { path: string; description: string; defaultValue?: unknown }) => ({
    path: field.path,
    description: field.description,
    ...(field.defaultValue !== undefined ? { defaultValue: field.defaultValue } : {}),
  }));
  const basePayload = {
    specVersion: 'ai-paths.semantic-grammar.v1',
    nodeDocVersion: '2026-02-20.v1',
    nodeType: doc.type,
    title: doc.title,
    purpose: doc.purpose,
    inputs: doc.inputs,
    outputs: doc.outputs,
    configFields,
    notes: doc.notes ?? [],
    ...(defaultConfig ? { defaultConfig } : {}),
    semanticNodeExample: {
      id: `node_${doc.type}`,
      type: doc.type,
      title: doc.title,
      description: doc.purpose,
      position: { x: 100, y: 100 },
      inputs: doc.inputs,
      outputs: doc.outputs,
      ...(defaultConfig ? { config: defaultConfig } : {}),
      data: {},
      connections: {
        incoming: [],
        outgoing: [],
      },
    },
  };
  const nodeHash = computeNodeHash(basePayload);
  const payload = {
    ...basePayload,
    nodeHashAlgorithm: 'sha256' as const,
    nodeHash,
  };

  fs.writeFileSync(filePath, stableJson(payload), 'utf8');

  const runtimeFieldCount = configFields.filter((field: { path: string }) =>
    field.path.startsWith('runtime.')
  ).length;
  const criticalFieldCount = configFields.filter((field: { path: string }) =>
    CRITICAL_CONFIG_FIELD_PATTERN.test(field.path)
  ).length;
  const defaultConfigKeyCount = defaultConfig ? Object.keys(defaultConfig).length : 0;

  indexRows.push({
    nodeType: doc.type,
    title: doc.title,
    file: `docs/ai-paths/semantic-grammar/nodes/${fileName}`,
    nodeHash,
    nodeHashAlgorithm: 'sha256',
    inputCount: doc.inputs.length,
    outputCount: doc.outputs.length,
    configFieldCount: doc.config.length,
    runtimeFieldCount,
    criticalFieldCount,
    hasDefaultConfig: Boolean(defaultConfig),
    defaultConfigKeyCount,
    purposeSummary: summarizePurpose(doc.purpose),
  });
}

const sortedRows = indexRows.sort((left, right) => left.nodeType.localeCompare(right.nodeType));
fs.writeFileSync(path.join(nodesDir, 'index.json'), stableJson(sortedRows), 'utf8');

const readmeLines = [
  '# Semantic Grammar Node JSON',
  '',
  'Generated JSON scaffolds for every AI-Paths node type with deterministic per-node hashes.',
  '',
  '- One file per node type (`<nodeType>.json`)',
  '- Every node file includes `nodeHashAlgorithm` + `nodeHash` (`sha256`)',
  '- `index.json` contains per-node hash + quick metadata for docs-driven validation inference',
  '- Source of truth: `src/shared/lib/ai-paths/core/docs/node-docs.ts`',
  '- Optional default config seeded from: `src/shared/lib/ai-paths/core/definitions/index.ts`',
  '- Generation prunes stale per-node JSON artifacts not present in `AI_PATHS_NODE_DOCS`',
  '- Check fails fast if unexpected per-node JSON artifacts are present',
  '',
  'Regenerate:',
  '',
  '```bash',
  'npm run docs:ai-paths:semantic:generate',
  '```',
  '',
];
fs.writeFileSync(path.join(nodesDir, 'README.md'), readmeLines.join('\n'), 'utf8');

console.log(`Semantic grammar node docs generated for ${sortedRows.length} node types.`);
