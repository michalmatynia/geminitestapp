import fs from 'node:fs';
import path from 'node:path';

import { palette } from '../../src/features/ai/ai-paths/lib/core/definitions';
import { AI_PATHS_NODE_DOCS } from '../../src/features/ai/ai-paths/lib/core/docs/node-docs';

const workspaceRoot = process.cwd();
const semanticDocsDir = path.join(
  workspaceRoot,
  'docs/ai-paths/semantic-grammar',
);
const nodesDir = path.join(semanticDocsDir, 'nodes');

type NodeDocExportRow = {
  nodeType: string;
  title: string;
  file: string;
  inputCount: number;
  outputCount: number;
  configFieldCount: number;
};

const resolveDefaultConfig = (nodeType: string): Record<string, unknown> | undefined => {
  const typedWithConfig = palette.find(
    (definition) =>
      definition.type === nodeType &&
      definition.config &&
      typeof definition.config === 'object',
  );
  if (typedWithConfig?.config && typeof typedWithConfig.config === 'object') {
    return typedWithConfig.config as Record<string, unknown>;
  }
  return undefined;
};

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const indexRows: NodeDocExportRow[] = [];

fs.mkdirSync(nodesDir, { recursive: true });

for (const doc of AI_PATHS_NODE_DOCS) {
  const fileName = `${doc.type}.json`;
  const filePath = path.join(nodesDir, fileName);
  const defaultConfig = resolveDefaultConfig(doc.type);

  const payload = {
    specVersion: 'ai-paths.semantic-grammar.v1',
    nodeType: doc.type,
    title: doc.title,
    purpose: doc.purpose,
    inputs: doc.inputs,
    outputs: doc.outputs,
    configFields: doc.config.map((field) => ({
      path: field.path,
      description: field.description,
      ...(field.defaultValue !== undefined
        ? { defaultValue: field.defaultValue }
        : {}),
    })),
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

  fs.writeFileSync(filePath, stableJson(payload), 'utf8');

  indexRows.push({
    nodeType: doc.type,
    title: doc.title,
    file: `docs/ai-paths/semantic-grammar/nodes/${fileName}`,
    inputCount: doc.inputs.length,
    outputCount: doc.outputs.length,
    configFieldCount: doc.config.length,
  });
}

const sortedRows = indexRows.sort((left, right) =>
  left.nodeType.localeCompare(right.nodeType),
);
fs.writeFileSync(path.join(nodesDir, 'index.json'), stableJson(sortedRows), 'utf8');

const readmeLines = [
  '# Semantic Grammar Node JSON',
  '',
  'Generated JSON scaffolds for every AI-Paths node type.',
  '',
  '- One file per node type (`<nodeType>.json`)',
  '- Source of truth: `src/features/ai/ai-paths/lib/core/docs/node-docs.ts`',
  '- Optional default config seeded from: `src/features/ai/ai-paths/lib/core/definitions/index.ts`',
  '',
  'Regenerate:',
  '',
  '```bash',
  'npm run docs:ai-paths:semantic:generate',
  '```',
  '',
];
fs.writeFileSync(path.join(nodesDir, 'README.md'), readmeLines.join('\n'), 'utf8');

console.log(
  `Semantic grammar node docs generated for ${sortedRows.length} node types.`,
);
