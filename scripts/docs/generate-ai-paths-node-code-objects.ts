import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import { AI_PATHS_NODE_DOCS } from '@/shared/lib/ai-paths/core/docs/node-docs';

type SemanticNodeDoc = {
  specVersion: string;
  nodeDocVersion: string;
  nodeType: string;
  title: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  configFields: Array<{
    path: string;
    description: string;
    defaultValue?: unknown;
  }>;
  notes?: string[];
  defaultConfig?: Record<string, unknown>;
  semanticNodeExample?: Record<string, unknown>;
  nodeHashAlgorithm?: string;
  nodeHash?: string;
};

type NodeDocSource = (typeof AI_PATHS_NODE_DOCS)[number];

type PortableNodeState = {
  meaning: string;
  edgeAnimationPolicy: {
    incoming: 'inactive' | 'active_when_receiving' | 'active_if_signal_present';
    outgoing: 'inactive' | 'active_on_emit' | 'active_if_cached_output_present';
  };
};

type PortableNodeCodeObject = {
  schemaVersion: 'ai-paths.node-code-object.v2';
  kind: 'path_node_code_object';
  specVersion: string;
  generatedAt: string;
  id: string;
  nodeType: string;
  nodeDocVersion: string;
  title: string;
  purpose: string;
  nodeFamily: string;
  portability: {
    copyPasteReady: boolean;
    requiresUniqueNodeId: boolean;
    compatibleEngines: string[];
  };
  ports: {
    inputs: string[];
    outputs: string[];
  };
  statusModel: Record<string, PortableNodeState>;
  runtimeSemantics: {
    executionKind: 'synchronous' | 'asynchronous';
    waitForResultSupported: boolean;
    wireActivationRules: {
      processing: string;
      waiting: string;
      completed: string;
      errored: string;
    };
  };
  configContract: {
    fields: Array<{
      path: string;
      description: string;
      defaultValue?: unknown;
    }>;
  };
  copyPaste: {
    minimalNode: Record<string, unknown>;
    fullNode: Record<string, unknown>;
    pathSnippet: {
      nodes: Array<Record<string, unknown>>;
      edges: Array<Record<string, unknown>>;
    };
  };
  notes: string[];
  source: {
    semanticNodeFile: string;
    semanticNodeHashAlgorithm: string | null;
    semanticNodeHash: string | null;
  };
  objectHashAlgorithm: 'sha256';
  objectHash: string;
};

type PortableNodeCodeObjectIndexRow = {
  id: string;
  nodeType: string;
  title: string;
  nodeFamily: string;
  objectFile: string;
  objectHashAlgorithm: 'sha256';
  objectHash: string;
  semanticNodeHashAlgorithm: string | null;
  semanticNodeHash: string | null;
  inputCount: number;
  outputCount: number;
  configFieldCount: number;
};

const workspaceRoot = process.cwd();
const semanticNodesDir = path.join(workspaceRoot, 'docs/ai-paths/semantic-grammar/nodes');
const outputDir = path.join(workspaceRoot, 'docs/ai-paths/node-code-objects-v2');

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

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

const toObjectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const parseDefaultValue = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (trimmed.length === 0) return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed) as unknown;
    } catch {
      return trimmed;
    }
  }
  return trimmed;
};

const setPathValue = (
  target: Record<string, unknown>,
  pathParts: string[],
  value: unknown
): void => {
  if (pathParts.length === 0) return;
  const [head, ...rest] = pathParts;
  if (!head) return;
  if (rest.length === 0) {
    target[head] = value;
    return;
  }
  const existing = target[head];
  const nested =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? (existing as Record<string, unknown>)
      : {};
  target[head] = nested;
  setPathValue(nested, rest, value);
};

const mergeRecords = (
  left: Record<string, unknown>,
  right: Record<string, unknown>
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...left };
  for (const [key, rightValue] of Object.entries(right)) {
    const leftValue = merged[key];
    if (
      leftValue &&
      typeof leftValue === 'object' &&
      !Array.isArray(leftValue) &&
      rightValue &&
      typeof rightValue === 'object' &&
      !Array.isArray(rightValue)
    ) {
      merged[key] = mergeRecords(
        leftValue as Record<string, unknown>,
        rightValue as Record<string, unknown>
      );
      continue;
    }
    merged[key] = rightValue;
  }
  return merged;
};

const resolveNodeFamily = (nodeType: string): string => {
  if (
    ['trigger', 'fetcher', 'simulation', 'poll', 'delay', 'iterator', 'router', 'gate', 'compare'].includes(
      nodeType
    )
  ) {
    return 'orchestration';
  }
  if (
    ['context', 'parser', 'regex', 'mapper', 'mutator', 'string_mutator', 'validator', 'validation_pattern', 'constant', 'math', 'template', 'bundle'].includes(
      nodeType
    )
  ) {
    return 'transform';
  }
  if (['prompt', 'model', 'agent', 'learner_agent', 'ai_description'].includes(nodeType)) {
    return 'ai-generation';
  }
  if (['database', 'db_schema', 'http', 'api_advanced', 'playwright', 'notification', 'viewer'].includes(nodeType)) {
    return 'integration';
  }
  if (['audio_oscillator', 'audio_speaker'].includes(nodeType)) {
    return 'audio';
  }
  return 'general';
};

const resolveExecutionKind = (nodeType: string): 'synchronous' | 'asynchronous' =>
  ['model', 'agent', 'learner_agent', 'ai_description', 'http', 'api_advanced', 'playwright', 'poll', 'notification'].includes(
    nodeType
  )
    ? 'asynchronous'
    : 'synchronous';

const resolveWaitForResultSupport = (nodeType: string): boolean =>
  ['model', 'agent', 'learner_agent', 'ai_description', 'playwright', 'http', 'api_advanced'].includes(nodeType);

const buildConfigFromFieldDefaults = (
  fields: Array<{ path: string; defaultValue?: unknown }>
): Record<string, unknown> => {
  const config: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue === undefined) continue;
    const normalizedPath = field.path.replace(/^node\.config\./, '').trim();
    if (normalizedPath.length === 0) continue;
    setPathValue(config, normalizedPath.split('.'), parseDefaultValue(field.defaultValue));
  }
  return config;
};

const buildStatusModel = (): Record<string, PortableNodeState> => ({
  idle: {
    meaning: 'Node has not started for the current run.',
    edgeAnimationPolicy: {
      incoming: 'inactive',
      outgoing: 'inactive',
    },
  },
  processing: {
    meaning:
      'Node is actively computing. Pulsating indicates processing, not waiting. Outgoing edges stay inactive until an output port receives a value.',
    edgeAnimationPolicy: {
      incoming: 'active_if_signal_present',
      outgoing: 'inactive',
    },
  },
  waiting: {
    meaning:
      'Node is waiting for an external callback/response. Previously consumed input edges must stop animating; outgoing edges remain inactive until output exists.',
    edgeAnimationPolicy: {
      incoming: 'inactive',
      outgoing: 'inactive',
    },
  },
  success: {
    meaning: 'Node completed successfully and emitted output values.',
    edgeAnimationPolicy: {
      incoming: 'inactive',
      outgoing: 'active_on_emit',
    },
  },
  error: {
    meaning: 'Node failed and may emit error-specific outputs.',
    edgeAnimationPolicy: {
      incoming: 'inactive',
      outgoing: 'active_on_emit',
    },
  },
  skipped: {
    meaning: 'Node execution was skipped by control flow or guard conditions.',
    edgeAnimationPolicy: {
      incoming: 'inactive',
      outgoing: 'inactive',
    },
  },
});

const buildMinimalNode = (
  nodeType: string,
  title: string,
  purpose: string,
  inputs: string[],
  outputs: string[]
): Record<string, unknown> => ({
  id: `node_${nodeType}_example`,
  type: nodeType,
  title,
  description: purpose,
  position: { x: 100, y: 100 },
  inputs,
  outputs,
  data: {},
  connections: {
    incoming: [],
    outgoing: [],
  },
});

const generatedAt = new Date().toISOString();

fs.mkdirSync(outputDir, { recursive: true });

const rows: PortableNodeCodeObjectIndexRow[] = [];

const toFallbackSemanticDoc = (doc: NodeDocSource): SemanticNodeDoc => ({
  specVersion: 'ai-paths.semantic-grammar.v1',
  nodeDocVersion: 'from-node-docs',
  nodeType: doc.type,
  title: doc.title,
  purpose: doc.purpose,
  inputs: doc.inputs,
  outputs: doc.outputs,
  configFields: doc.config.map((field) => ({
    path: field.path,
    description: field.description,
    ...(field.defaultValue === undefined ? {} : { defaultValue: field.defaultValue }),
  })),
  notes: doc.notes,
  defaultConfig: toObjectRecord(doc.defaultConfig),
  semanticNodeExample: buildMinimalNode(doc.type, doc.title, doc.purpose, doc.inputs, doc.outputs),
});

for (const doc of [...AI_PATHS_NODE_DOCS].sort((left, right) => left.type.localeCompare(right.type))) {
  const semanticFileName = `${doc.type}.json`;
  const semanticFilePath = path.join(semanticNodesDir, semanticFileName);
  const semanticDoc = fs.existsSync(semanticFilePath)
    ? (JSON.parse(fs.readFileSync(semanticFilePath, 'utf8')) as SemanticNodeDoc)
    : toFallbackSemanticDoc(doc);

  const fieldDefaults = buildConfigFromFieldDefaults(semanticDoc.configFields);
  const mergedDefaults = mergeRecords(
    fieldDefaults,
    mergeRecords(toObjectRecord(doc.defaultConfig), toObjectRecord(semanticDoc.defaultConfig))
  );
  const minimalNode = buildMinimalNode(
    semanticDoc.nodeType,
    semanticDoc.title,
    semanticDoc.purpose,
    semanticDoc.inputs,
    semanticDoc.outputs
  );
  const fullNode = {
    ...minimalNode,
    config: mergedDefaults,
  };

  const objectWithoutHash = {
    schemaVersion: 'ai-paths.node-code-object.v2' as const,
    kind: 'path_node_code_object' as const,
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    generatedAt,
    id: `node_obj_${semanticDoc.nodeType}_portable_v2`,
    nodeType: semanticDoc.nodeType,
    nodeDocVersion: semanticDoc.nodeDocVersion,
    title: semanticDoc.title,
    purpose: semanticDoc.purpose,
    nodeFamily: resolveNodeFamily(semanticDoc.nodeType),
    portability: {
      copyPasteReady: true,
      requiresUniqueNodeId: true,
      compatibleEngines: [AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION],
    },
    ports: {
      inputs: semanticDoc.inputs,
      outputs: semanticDoc.outputs,
    },
    statusModel: buildStatusModel(),
    runtimeSemantics: {
      executionKind: resolveExecutionKind(semanticDoc.nodeType),
      waitForResultSupported: resolveWaitForResultSupport(semanticDoc.nodeType),
      wireActivationRules: {
        processing:
          'When node is processing, show node pulse only. Do not animate outgoing edges until an output port value is produced.',
        waiting:
          'When node is waiting for external response, keep both consumed incoming and future outgoing edges inactive.',
        completed:
          'Animate only edges carrying newly emitted outputs.',
        errored:
          'Animate only explicit error-route outputs (if connected).',
      },
    },
    configContract: {
      fields: semanticDoc.configFields.map((field) => ({
        path: field.path,
        description: field.description,
        ...(field.defaultValue === undefined ? {} : { defaultValue: field.defaultValue }),
      })),
    },
    copyPaste: {
      minimalNode,
      fullNode,
      pathSnippet: {
        nodes: [fullNode],
        edges: [],
      },
    },
    notes: semanticDoc.notes ?? doc.notes ?? [],
    source: {
      semanticNodeFile: fs.existsSync(semanticFilePath)
        ? `docs/ai-paths/semantic-grammar/nodes/${semanticFileName}`
        : 'src/shared/lib/ai-paths/core/docs/node-docs.ts',
      semanticNodeHashAlgorithm:
        typeof semanticDoc.nodeHashAlgorithm === 'string' ? semanticDoc.nodeHashAlgorithm : null,
      semanticNodeHash: typeof semanticDoc.nodeHash === 'string' ? semanticDoc.nodeHash : null,
    },
    objectHashAlgorithm: 'sha256' as const,
  };

  const objectHash = computeHash(objectWithoutHash);
  const payload: PortableNodeCodeObject = {
    ...objectWithoutHash,
    objectHash,
  };

  const outputFileName = `${semanticDoc.nodeType}.json`;
  fs.writeFileSync(path.join(outputDir, outputFileName), stableJson(payload), 'utf8');

  rows.push({
    id: payload.id,
    nodeType: payload.nodeType,
    title: payload.title,
    nodeFamily: payload.nodeFamily,
    objectFile: `docs/ai-paths/node-code-objects-v2/${outputFileName}`,
    objectHashAlgorithm: payload.objectHashAlgorithm,
    objectHash: payload.objectHash,
    semanticNodeHashAlgorithm: payload.source.semanticNodeHashAlgorithm,
    semanticNodeHash: payload.source.semanticNodeHash,
    inputCount: payload.ports.inputs.length,
    outputCount: payload.ports.outputs.length,
    configFieldCount: payload.configContract.fields.length,
  });
}

const sortedRows = rows.sort((left, right) => left.nodeType.localeCompare(right.nodeType));
const indexPayload = {
  schemaVersion: 'ai-paths.node-code-object-index.v2',
  generatedAt,
  totalObjects: sortedRows.length,
  objects: sortedRows,
};
fs.writeFileSync(path.join(outputDir, 'index.json'), stableJson(indexPayload), 'utf8');

const readmeLines = [
  '# AI-Paths Node Code Objects (v2)',
  '',
  'Generated portable semantic node objects for copy/paste-safe AI-Paths authoring.',
  '',
  '- Source docs: `docs/ai-paths/semantic-grammar/nodes/*.json` + `AI_PATHS_NODE_DOCS` fallback',
  '- Index: `index.json`',
  '- One object per node type: `<nodeType>.json`',
  '- Integrity: deterministic `objectHash` (`sha256`)',
  '',
  'Regenerate:',
  '',
  '```bash',
  'npm run docs:ai-paths:node-code:generate',
  '```',
  '',
  'Check:',
  '',
  '```bash',
  'npm run docs:ai-paths:node-code:check',
  '```',
  '',
];
fs.writeFileSync(path.join(outputDir, 'README.md'), `${readmeLines.join('\n')}\n`, 'utf8');

console.log(`Generated ${sortedRows.length} AI-Paths node code objects (v2).`);
