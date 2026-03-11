import {
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
  DOCS_WIRING_SNIPPET,
} from '@/shared/lib/ai-paths/core/definitions/docs-snippets';

import { type AiPathsDocsManifest } from './docs-registry-adapter.types';

export const DOC_ASSERTION_BLOCK_REGEX = /```ai-paths-assertion\s*([\s\S]*?)```/gim;
export const DOCS_MANIFEST_PATH = 'docs/ai-paths/node-validator-central-manifest.json';
export const NODE_DOCS_CATALOG_SOURCE_PATH = 'src/shared/lib/ai-paths/core/docs/node-docs.ts';
export const DOCS_SNIPPETS_SOURCE_PATH =
  'src/shared/lib/ai-paths/core/definitions/docs-snippets.ts';

export const CRITICAL_CONFIG_FIELD_PATTERN =
  /(entityId|collection|modelId|template|event|pattern|queryTemplate|intervalMs|maxAttempts|mappings|url)$/i;

export const BUILTIN_FALLBACK_MANIFEST: AiPathsDocsManifest = {
  version: 'builtin.v1',
  sources: [
    {
      id: 'core-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-core-patterns.md',
      enabled: true,
      priority: 10,
      tags: ['core', 'graph', 'trigger'],
    },
    {
      id: 'simulation-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-simulation-patterns.md',
      enabled: true,
      priority: 20,
      tags: ['simulation'],
    },
    {
      id: 'database-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-database-patterns.md',
      enabled: true,
      priority: 30,
      tags: ['database', 'safety'],
    },
    {
      id: 'runtime-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-runtime-patterns.md',
      enabled: true,
      priority: 40,
      tags: ['runtime', 'async'],
    },
    {
      id: 'wiring-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-wiring-patterns.md',
      enabled: true,
      priority: 50,
      tags: ['wiring'],
    },
    {
      id: 'advanced-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-advanced-patterns.md',
      enabled: true,
      priority: 55,
      tags: ['advanced', 'extended-coverage'],
    },
    {
      id: 'semantic-grammar-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-semantic-grammar-patterns.md',
      enabled: true,
      priority: 57,
      tags: ['semantic-grammar', 'interop', 'graph'],
    },
    {
      id: 'node-code-parser-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-node-code-parser-patterns.md',
      enabled: true,
      priority: 58,
      tags: ['kernel-parser', 'node-code', 'pattern-list'],
    },
    {
      id: 'node-path-code-parser-patterns',
      type: 'markdown_assertion',
      path: 'docs/ai-paths/node-validator-node-path-code-parser-patterns.md',
      enabled: true,
      priority: 59,
      tags: ['kernel-parser', 'node-path-code', 'pattern-list'],
    },
    {
      id: 'node-docs-catalog',
      type: 'node_docs_catalog',
      path: NODE_DOCS_CATALOG_SOURCE_PATH,
      enabled: true,
      priority: 80,
      tags: ['catalog'],
    },
    {
      id: 'docs-snippets',
      type: 'docs_snippet',
      path: DOCS_SNIPPETS_SOURCE_PATH,
      enabled: true,
      priority: 90,
      tags: ['snippets', 'wiring'],
      snippetNames: ['DOCS_WIRING_SNIPPET', 'DOCS_DESCRIPTION_SNIPPET', 'DOCS_JOBS_SNIPPET'],
    },
    {
      id: 'semantic-nodes-catalog',
      type: 'semantic_nodes_catalog',
      path: 'docs/ai-paths/semantic-grammar/nodes/index.json',
      enabled: true,
      priority: 95,
      tags: ['semantic-grammar', 'nodes', 'catalog'],
    },
    {
      id: 'tooltip-docs-catalog',
      type: 'tooltip_docs_catalog',
      path: 'docs/ai-paths/tooltip-catalog.json',
      enabled: true,
      priority: 98,
      tags: ['tooltip', 'docs', 'catalog'],
    },
    {
      id: 'coverage-matrix',
      type: 'coverage_matrix_csv',
      path: 'docs/ai-paths/node-validator-coverage-matrix.csv',
      enabled: true,
      priority: 99,
      tags: ['coverage', 'matrix', 'inference'],
    },
  ],
};

export const NODE_LABEL_TO_TYPE: Record<string, string> = {
  trigger: 'trigger',
  fetcher: 'fetcher',
  simulation: 'simulation',
  contextfilter: 'context',
  context: 'context',
  parser: 'parser',
  database: 'database',
  poll: 'poll',
  model: 'model',
  prompt: 'prompt',
  resultviewer: 'viewer',
  validationpattern: 'validation_pattern',
  router: 'router',
  gate: 'gate',
  http: 'http',
  apiadvanced: 'api_advanced',
  dbschema: 'db_schema',
};

export const DOCS_SNIPPET_REGISTRY: Record<string, string> = {
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
};

export const ENUM_FALLBACK_LISTS_BY_SUFFIX: Array<{ suffix: RegExp; values: string[] }> = [
  { suffix: /\.provider$/i, values: ['mongodb'] },
  { suffix: /\.idType$/i, values: ['string', 'objectId'] },
  { suffix: /\.scopeMode$/i, values: ['full', 'include', 'exclude'] },
  { suffix: /\.scopeTarget$/i, values: ['entity', 'context'] },
  { suffix: /\.waveform$/i, values: ['sine', 'square', 'triangle', 'sawtooth'] },
  { suffix: /\.outputMode$/i, values: ['object', 'array'] },
  { suffix: /\.matchMode$/i, values: ['first', 'first_overall', 'all'] },
  { suffix: /\.runtime\.cache\.mode$/i, values: ['auto', 'force', 'disabled'] },
  { suffix: /\.runtimeMode$/i, values: ['validate_only', 'validate_and_fix'] },
  { suffix: /\.failPolicy$/i, values: ['block_on_error', 'warn_on_error', 'pass_through'] },
  { suffix: /\.mode$/i, values: ['preset', 'custom'] },
];

export const ENUM_INFERENCE_SUFFIX_HINT =
  /(provider|idType|mode|event|outputMode|matchMode|groupBy|scopeMode|scopeTarget|waveform|runtimeMode|failPolicy|strategy|source)$/i;

export const ENUM_VALUE_TOKEN_REGEX = /^[A-Za-z][A-Za-z0-9_.-]{0,40}$/;
export const ENUM_STOPWORDS = new Set([
  'and',
  'or',
  'for',
  'with',
  'from',
  'into',
  'when',
  'where',
  'example',
  'examples',
  'true',
  'false',
  'json',
  'path',
  'string',
  'value',
  'values',
  'node',
  'nodes',
  'input',
  'inputs',
  'output',
  'outputs',
]);
