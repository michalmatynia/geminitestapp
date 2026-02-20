import 'server-only';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { z } from 'zod';

import {
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
  DOCS_WIRING_SNIPPET,
} from '@/features/ai/ai-paths/components/ai-paths-settings/docs-snippets';
import type {
  AiPathsValidationModule,
  AiPathsValidationOperator,
  AiPathsValidationSeverity,
} from '@/shared/contracts/ai-paths';

import { AI_PATHS_NODE_DOCS } from '../docs/node-docs';

const DOC_ASSERTION_BLOCK_REGEX = /```ai-paths-assertion\s*([\s\S]*?)```/gim;
const DOCS_MANIFEST_PATH = 'docs/ai-paths/node-validator-central-manifest.json';

type AiPathsDocsManifestSourceType =
  | 'markdown_assertion'
  | 'node_docs_catalog'
  | 'docs_snippet'
  | 'semantic_nodes_catalog'
  | 'tooltip_docs_catalog'
  | 'coverage_matrix_csv';

export type AiPathsDocAssertionConditionInput = {
  id?: string | undefined;
  operator: AiPathsValidationOperator;
  field?: string | undefined;
  valuePath?: string | undefined;
  expected?: unknown;
  list?: string[] | undefined;
  flags?: string | undefined;
  port?: string | undefined;
  fromPort?: string | undefined;
  toPort?: string | undefined;
  fromNodeType?: string | undefined;
  toNodeType?: string | undefined;
  sourceNodeId?: string | undefined;
  targetNodeId?: string | undefined;
  collectionMapKey?: string | undefined;
  negate?: boolean | undefined;
};

export type AiPathsDocAssertion = {
  id: string;
  title: string;
  module: AiPathsValidationModule;
  severity: AiPathsValidationSeverity;
  sourcePath: string;
  sourceType:
    | 'markdown_assertion'
    | 'node_docs_catalog'
    | 'docs_snippet'
    | 'semantic_nodes_catalog'
    | 'tooltip_docs_catalog'
    | 'coverage_matrix_csv';
  sourceHash: string;
  confidence: number;
  sequenceHint?: number | undefined;
  weight?: number | undefined;
  forceProbabilityIfFailed?: number | undefined;
  description?: string | undefined;
  recommendation?: string | undefined;
  appliesToNodeTypes?: string[] | undefined;
  conditionMode?: 'all' | 'any' | undefined;
  docsBindings?: string[] | undefined;
  version?: string | undefined;
  tags?: string[] | undefined;
  deprecates?: string[] | undefined;
  sourceId?: string | undefined;
  sourcePriority?: number | undefined;
  conditions: AiPathsDocAssertionConditionInput[];
};

export type AiPathsDocsSnapshotSource = {
  id: string;
  path: string;
  type: AiPathsDocsManifestSourceType;
  hash: string;
  assertionCount: number;
  enabled?: boolean | undefined;
  priority?: number | undefined;
  tags?: string[] | undefined;
  snippetNames?: string[] | undefined;
};

export type AiPathsDocsSnapshot = {
  generatedAt: string;
  snapshotHash: string;
  sources: AiPathsDocsSnapshotSource[];
  warnings: string[];
  assertions: AiPathsDocAssertion[];
};

type AiPathsDocsManifestSource = {
  id: string;
  type: AiPathsDocsManifestSourceType;
  path: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  snippetNames?: string[] | undefined;
};

type AiPathsDocsManifest = {
  version: string;
  sources: AiPathsDocsManifestSource[];
};

const docAssertionConditionSchema = z.object({
  id: z.string().optional(),
  operator: z.enum([
    'exists',
    'non_empty',
    'equals',
    'in',
    'matches_regex',
    'wired_from',
    'wired_to',
    'has_incoming_port',
    'has_outgoing_port',
    'jsonpath_exists',
    'jsonpath_equals',
    'collection_exists',
    'entity_collection_resolves',
    'edge_endpoints_resolve',
    'edge_ports_declared',
    'node_types_known',
    'node_ids_unique',
    'edge_ids_unique',
    'node_positions_finite',
  ]),
  field: z.string().optional(),
  valuePath: z.string().optional(),
  expected: z.unknown().optional(),
  list: z.array(z.string()).optional(),
  flags: z.string().optional(),
  port: z.string().optional(),
  fromPort: z.string().optional(),
  toPort: z.string().optional(),
  fromNodeType: z.string().optional(),
  toNodeType: z.string().optional(),
  sourceNodeId: z.string().optional(),
  targetNodeId: z.string().optional(),
  collectionMapKey: z.string().optional(),
  negate: z.boolean().optional(),
});

const docAssertionSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  module: z.enum([
    'graph',
    'trigger',
    'simulation',
    'context',
    'parser',
    'database',
    'model',
    'poll',
    'router',
    'gate',
    'validation_pattern',
    'custom',
  ]),
  severity: z.enum(['error', 'warning', 'info']).optional(),
  description: z.string().optional(),
  recommendation: z.string().optional(),
  appliesToNodeTypes: z.array(z.string()).optional(),
  sequenceHint: z.number().int().optional(),
  weight: z.number().int().optional(),
  forceProbabilityIfFailed: z.number().optional(),
  conditionMode: z.enum(['all', 'any']).optional(),
  docsBindings: z.array(z.string()).optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
  deprecates: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  conditions: z.array(docAssertionConditionSchema).min(1),
});

const docsManifestSourceTypeSchema = z.enum([
  'markdown_assertion',
  'node_docs_catalog',
  'docs_snippet',
  'semantic_nodes_catalog',
  'tooltip_docs_catalog',
  'coverage_matrix_csv',
]);

const docsManifestSourceSchema = z.object({
  id: z.string().trim().min(1),
  type: docsManifestSourceTypeSchema,
  path: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  snippetNames: z.array(z.string()).optional(),
});

const docsManifestSchema = z.object({
  version: z.string().trim().min(1).optional(),
  sources: z.array(docsManifestSourceSchema).min(1),
});

const CRITICAL_CONFIG_FIELD_PATTERN =
  /(entityId|collection|modelId|template|event|pattern|queryTemplate|intervalMs|maxAttempts|mappings|url)$/i;

const LEGACY_FALLBACK_MANIFEST: AiPathsDocsManifest = {
  version: 'fallback.v1',
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
      id: 'node-docs-catalog',
      type: 'node_docs_catalog',
      path: 'src/features/ai/ai-paths/lib/core/docs/node-docs.ts',
      enabled: true,
      priority: 80,
      tags: ['catalog'],
    },
    {
      id: 'docs-snippets',
      type: 'docs_snippet',
      path: 'src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts',
      enabled: true,
      priority: 90,
      tags: ['snippets', 'wiring'],
      snippetNames: [
        'DOCS_WIRING_SNIPPET',
        'DOCS_DESCRIPTION_SNIPPET',
        'DOCS_JOBS_SNIPPET',
      ],
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

const hashText = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

const toModuleFromNodeType = (
  nodeType: string,
): AiPathsValidationModule => {
  if (nodeType === 'trigger') return 'trigger';
  if (nodeType === 'simulation') return 'simulation';
  if (nodeType === 'context') return 'context';
  if (nodeType === 'parser' || nodeType === 'regex') return 'parser';
  if (nodeType === 'database') return 'database';
  if (nodeType === 'model' || nodeType === 'agent' || nodeType === 'learner_agent') {
    return 'model';
  }
  if (nodeType === 'poll') return 'poll';
  if (nodeType === 'router') return 'router';
  if (nodeType === 'gate') return 'gate';
  if (nodeType === 'validation_pattern') return 'validation_pattern';
  return 'custom';
};

const normalizeLabel = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '');

const NODE_LABEL_TO_TYPE: Record<string, string> = {
  trigger: 'trigger',
  simulation: 'simulation',
  contextfilter: 'context',
  context: 'context',
  parser: 'parser',
  database: 'database',
  poll: 'poll',
  model: 'model',
  prompt: 'prompt',
  resultviewer: 'viewer',
  aidescriptiongenerator: 'ai_description',
  descriptionupdater: 'description_updater',
  validationpattern: 'validation_pattern',
  router: 'router',
  gate: 'gate',
  http: 'http',
  apiadvanced: 'api_advanced',
  dbschema: 'db_schema',
};

const DOCS_SNIPPET_REGISTRY: Record<string, string> = {
  DOCS_WIRING_SNIPPET,
  DOCS_DESCRIPTION_SNIPPET,
  DOCS_JOBS_SNIPPET,
};

const semanticNodeIndexRowSchema = z.object({
  nodeType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  file: z.string().trim().min(1),
  nodeHash: z.string().trim().regex(/^[a-f0-9]{64}$/i),
  nodeHashAlgorithm: z.literal('sha256'),
  inputCount: z.number().int().optional(),
  outputCount: z.number().int().optional(),
  configFieldCount: z.number().int().optional(),
  runtimeFieldCount: z.number().int().optional(),
  criticalFieldCount: z.number().int().optional(),
  hasDefaultConfig: z.boolean().optional(),
  defaultConfigKeyCount: z.number().int().optional(),
  purposeSummary: z.string().optional(),
});

const tooltipCatalogEntrySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  section: z.string().trim().min(1),
  aliases: z.array(z.string().trim()).optional(),
  docPath: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  uiTargets: z.array(z.string().trim()).optional(),
});

const coverageMatrixRowSchema = z.object({
  node_type: z.string().trim().min(1),
  config_completeness: z.string().trim().min(1),
  wiring_integrity: z.string().trim().min(1),
  runtime_safety: z.string().trim().min(1),
  provider_compatibility: z.string().trim().min(1),
  async_correctness: z.string().trim().min(1),
  persistence_safety: z.string().trim().min(1),
  coverage_status: z.string().trim().min(1),
  notes: z.string().optional(),
});

type CoverageMatrixDimensionValue = 'yes' | 'partial' | 'no' | 'n/a';

type CoverageMatrixRow = z.infer<typeof coverageMatrixRowSchema>;

const ENUM_FALLBACK_LISTS_BY_SUFFIX: Array<{ suffix: RegExp; values: string[] }> = [
  { suffix: /\.provider$/i, values: ['mongodb', 'prisma'] },
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

const ENUM_INFERENCE_SUFFIX_HINT =
  /(provider|idType|mode|event|outputMode|matchMode|groupBy|scopeMode|scopeTarget|waveform|runtimeMode|failPolicy|strategy|source)$/i;

const ENUM_VALUE_TOKEN_REGEX = /^[A-Za-z][A-Za-z0-9_.-]{0,40}$/;
const ENUM_STOPWORDS = new Set([
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

const uniqueStringList = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0),
    ),
  );

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index] ?? '';
    const next = line[index + 1] ?? '';
    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values.map((value: string): string =>
    value.startsWith('"') && value.endsWith('"')
      ? value.slice(1, -1).trim()
      : value,
  );
};

const parseCsvRecords = (
  csvText: string,
): Array<Record<string, string>> => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0);
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0] ?? '').map((field: string): string =>
    field.trim().toLowerCase(),
  );
  return lines.slice(1).map((line: string): Record<string, string> => {
    const cells = parseCsvLine(line);
    return header.reduce<Record<string, string>>(
      (acc: Record<string, string>, key: string, index: number): Record<string, string> => {
        acc[key] = (cells[index] ?? '').trim();
        return acc;
      },
      {},
    );
  });
};

const normalizeCoverageDimension = (
  value: string,
): CoverageMatrixDimensionValue => {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'yes') return 'yes';
  if (normalized === 'partial') return 'partial';
  if (normalized === 'n/a') return 'n/a';
  return 'no';
};

const sanitizeFieldPathForId = (value: string): string =>
  value.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

const inferEnumListFromDescription = (
  fieldPath: string,
  description: string,
  defaultValue?: string,
): string[] => {
  const harvested: string[] = [];
  const normalizedDescription = description.trim();
  const normalizedPath = fieldPath.trim();

  const pushToken = (token: string): void => {
    const normalized = token.trim();
    if (!normalized) return;
    const lower = normalized.toLowerCase();
    if (!ENUM_VALUE_TOKEN_REGEX.test(normalized)) return;
    if (ENUM_STOPWORDS.has(lower)) return;
    harvested.push(normalized);
  };

  for (const match of normalizedDescription.matchAll(/\(([A-Za-z0-9_.|/\- ]{3,120})\)/g)) {
    const chunk = match[1] ?? '';
    if (chunk.includes('|')) {
      chunk.split('|').forEach(pushToken);
      continue;
    }
    if (chunk.includes('/')) {
      chunk.split('/').forEach(pushToken);
    }
  }

  for (const match of normalizedDescription.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,40}(?:\/[A-Za-z][A-Za-z0-9_.-]{1,40}){1,7})\b/g)) {
    const chunk = match[1] ?? '';
    chunk.split('/').forEach(pushToken);
  }

  for (const match of normalizedDescription.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,40})\s*=/g)) {
    const token = match[1] ?? '';
    pushToken(token);
  }

  for (const match of normalizedDescription.matchAll(/:\s*([A-Za-z0-9_.\-, ]{4,160})\./g)) {
    const chunk = match[1] ?? '';
    if (!chunk.includes(',')) continue;
    chunk.split(',').forEach(pushToken);
  }

  const normalizedDefault = `${defaultValue ?? ''}`.replace(/^"|"$/g, '').trim();
  if (normalizedDefault && ENUM_VALUE_TOKEN_REGEX.test(normalizedDefault)) {
    pushToken(normalizedDefault);
  }

  const fallback = ENUM_FALLBACK_LISTS_BY_SUFFIX.find(({ suffix }) => suffix.test(normalizedPath));
  if (fallback) {
    fallback.values.forEach(pushToken);
  }

  const uniqueValues = uniqueStringList(harvested);
  if (!ENUM_INFERENCE_SUFFIX_HINT.test(normalizedPath) && uniqueValues.length < 3) {
    return [];
  }
  if (uniqueValues.length < 2) return [];
  return uniqueValues.slice(0, 12);
};

const shouldInferRequiredBooleanFromDefault = (
  fieldPath: string,
  defaultValue?: string,
): boolean => {
  if (!defaultValue) return false;
  const normalized = defaultValue.replace(/^"|"$/g, '').trim().toLowerCase();
  if (normalized !== 'true' && normalized !== 'false') return false;
  return /enabled|waitFor|auto|include|dryRun|skip|trim|strict|stop|vision|silent/i.test(
    fieldPath,
  );
};

const coverageDimensionSeverity = (
  dimension: CoverageMatrixDimensionValue,
  coverageStatus: CoverageMatrixDimensionValue,
): AiPathsValidationSeverity => {
  if (dimension === 'yes' && coverageStatus === 'yes') return 'warning';
  return 'info';
};

const parseSnippetWiringAssertions = (
  snippetName: string,
  snippetText: string,
  sourceHash: string,
): AiPathsDocAssertion[] => {
  const sourcePath = `src/features/ai/ai-paths/components/ai-paths-settings/docs-snippets.ts#${snippetName}`;
  const snippetSlug = snippetName.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  const parsed = snippetText
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.includes('→') || line.includes('->'))
    .map((line: string): AiPathsDocAssertion[] | null => {
      const normalized = line
        .replace(/\s+/g, ' ')
        .replace(/->/g, '→');
      const [leftRaw, rightRaw] = normalized.split('→').map((chunk) => chunk.trim());
      if (!leftRaw || !rightRaw) return null;
      const [fromLabelRaw, fromPortRaw] = leftRaw.split('.').map((chunk) => chunk.trim());
      const [toLabelRaw, toPortRaw] = rightRaw.split('.').map((chunk) => chunk.trim());
      if (!fromLabelRaw || !toLabelRaw || !fromPortRaw || !toPortRaw) return null;
      const fromType = NODE_LABEL_TO_TYPE[normalizeLabel(fromLabelRaw)];
      const toType = NODE_LABEL_TO_TYPE[normalizeLabel(toLabelRaw)];
      if (!fromType || !toType) return null;
      const id = `snippet_wire_${snippetSlug}_${fromType}_${fromPortRaw}_to_${toType}_${toPortRaw}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
      const forwardAssertion: AiPathsDocAssertion = {
        id,
        title: `${fromLabelRaw}.${fromPortRaw} connects to ${toLabelRaw}.${toPortRaw}`,
        module: toModuleFromNodeType(fromType),
        severity: 'info',
        description: `Wiring guideline from ${snippetName}: ${fromLabelRaw}.${fromPortRaw} -> ${toLabelRaw}.${toPortRaw}.`,
        recommendation: `Connect ${fromLabelRaw}.${fromPortRaw} output into ${toLabelRaw}.${toPortRaw} input where applicable.`,
        appliesToNodeTypes: [fromType],
        conditionMode: 'all',
        sequenceHint: 300,
        confidence: 0.6,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_to',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            toNodeType: toType,
          },
        ],
      };
      const reverseId = `snippet_wire_rev_${snippetSlug}_${toType}_${toPortRaw}_from_${fromType}_${fromPortRaw}`
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_');
      const reverseAssertion: AiPathsDocAssertion = {
        id: reverseId,
        title: `${toLabelRaw}.${toPortRaw} expects ${fromLabelRaw}.${fromPortRaw}`,
        module: toModuleFromNodeType(toType),
        severity: 'info',
        description: `Reverse wiring guideline from ${snippetName}: ${toLabelRaw}.${toPortRaw} should be fed from ${fromLabelRaw}.${fromPortRaw}.`,
        recommendation: `Wire ${toLabelRaw}.${toPortRaw} from ${fromLabelRaw}.${fromPortRaw} where this branch is used.`,
        appliesToNodeTypes: [toType],
        conditionMode: 'all',
        sequenceHint: 302,
        confidence: 0.58,
        sourcePath,
        sourceType: 'docs_snippet',
        sourceHash,
        docsBindings: [sourcePath],
        conditions: [
          {
            operator: 'wired_from',
            fromPort: fromPortRaw,
            toPort: toPortRaw,
            fromNodeType: fromType,
          },
        ],
      };
      return [forwardAssertion, reverseAssertion];
    })
    .flatMap((entry: AiPathsDocAssertion[] | null): AiPathsDocAssertion[] =>
      Array.isArray(entry) ? entry : [],
    );
  const seen = new Set<string>();
  return parsed.filter((assertion: AiPathsDocAssertion): boolean => {
    if (seen.has(assertion.id)) return false;
    seen.add(assertion.id);
    return true;
  });
};

export const extractAiPathsAssertionsFromMarkdown = (
  markdown: string,
  sourcePath: string,
  sourceHash: string,
): { assertions: AiPathsDocAssertion[]; warnings: string[] } => {
  const assertions: AiPathsDocAssertion[] = [];
  const warnings: string[] = [];
  const matches = Array.from(markdown.matchAll(DOC_ASSERTION_BLOCK_REGEX));

  matches.forEach((match: RegExpMatchArray, index: number) => {
    const raw = (match[1] ?? '').trim();
    if (!raw) return;
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      warnings.push(
        `${sourcePath}: assertion block ${index + 1} is invalid JSON.`,
      );
      return;
    }
    const result = docAssertionSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${sourcePath}: assertion block ${index + 1} failed schema validation.`,
      );
      return;
    }
    const value = result.data;
    assertions.push({
      id: value.id,
      title: value.title,
      module: value.module,
      severity: value.severity ?? 'warning',
      ...(value.description ? { description: value.description } : {}),
      ...(value.recommendation ? { recommendation: value.recommendation } : {}),
      ...(value.appliesToNodeTypes?.length
        ? { appliesToNodeTypes: value.appliesToNodeTypes }
        : {}),
      ...(value.sequenceHint !== undefined ? { sequenceHint: value.sequenceHint } : {}),
      ...(value.weight !== undefined ? { weight: value.weight } : {}),
      ...(value.forceProbabilityIfFailed !== undefined
        ? { forceProbabilityIfFailed: value.forceProbabilityIfFailed }
        : {}),
      ...(value.conditionMode ? { conditionMode: value.conditionMode } : {}),
      ...(value.docsBindings?.length ? { docsBindings: value.docsBindings } : {}),
      ...(value.version ? { version: value.version } : {}),
      ...(value.tags?.length ? { tags: value.tags } : {}),
      ...(value.deprecates?.length ? { deprecates: value.deprecates } : {}),
      sourcePath,
      sourceType: 'markdown_assertion',
      sourceHash,
      confidence: value.confidence ?? 0.9,
      conditions: value.conditions,
    });
  });

  return { assertions, warnings };
};

const buildNodeDocsCatalogAssertions = (): AiPathsDocAssertion[] => {
  const sourcePath = 'src/features/ai/ai-paths/lib/core/docs/node-docs.ts';
  const sourceHash = hashText(JSON.stringify(AI_PATHS_NODE_DOCS));
  const assertions: AiPathsDocAssertion[] = [];
  const seenIds = new Set<string>();

  const pushAssertion = (assertion: AiPathsDocAssertion): void => {
    if (seenIds.has(assertion.id)) return;
    seenIds.add(assertion.id);
    assertions.push(assertion);
  };

  AI_PATHS_NODE_DOCS.forEach((doc) => {
    doc.config.forEach((field) => {
      const normalizedPath = field.path.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
      const conditionField = `config.${field.path}`;
      const isCritical = CRITICAL_CONFIG_FIELD_PATTERN.test(field.path);
      if (isCritical) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.non_empty`,
          title: `${doc.title}: ${field.path} should be configured`,
          module: toModuleFromNodeType(doc.type),
          severity: /entityid|collection|modelid|event/i.test(field.path)
            ? 'error'
            : 'warning',
          description: field.description,
          recommendation: `Set ${conditionField} in ${doc.title} configuration.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 260,
          confidence: 0.55,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'non_empty',
              field: conditionField,
            },
          ],
        });
      }

      const enumValues = inferEnumListFromDescription(
        field.path,
        field.description,
        field.defaultValue,
      );
      if (enumValues.length >= 2) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.allowed_values`,
          title: `${doc.title}: ${field.path} uses documented values`,
          module: toModuleFromNodeType(doc.type),
          severity: /(provider|event|operation|runtimeMode|failPolicy|actionCategory|action)$/i.test(
            field.path,
          )
            ? 'error'
            : 'warning',
          description: `${field.description} Allowed values inferred from docs: ${enumValues.join(', ')}.`,
          recommendation: `Set ${conditionField} to one of: ${enumValues.join(', ')}.`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 262,
          confidence: 0.5,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'in',
              field: conditionField,
              list: enumValues,
            },
          ],
        });
      }

      if (shouldInferRequiredBooleanFromDefault(field.path, field.defaultValue)) {
        pushAssertion({
          id: `catalog.${doc.type}.${normalizedPath}.exists`,
          title: `${doc.title}: ${field.path} flag explicitly set`,
          module: toModuleFromNodeType(doc.type),
          severity: 'info',
          description: `${field.description} Documentation indicates this flag should be explicit for predictable runtime behavior.`,
          recommendation: `Set ${conditionField} explicitly (true/false).`,
          appliesToNodeTypes: [doc.type],
          sequenceHint: 264,
          confidence: 0.45,
          sourcePath,
          sourceType: 'node_docs_catalog',
          sourceHash,
          docsBindings: [sourcePath],
          conditions: [
            {
              operator: 'exists',
              field: conditionField,
            },
          ],
        });
      }
    });
  });
  return assertions;
};

const normalizeManifestSource = (
  source: z.infer<typeof docsManifestSourceSchema>,
): AiPathsDocsManifestSource => ({
  id: source.id.trim(),
  type: source.type,
  path: source.path.trim(),
  enabled: source.enabled !== false,
  priority:
    typeof source.priority === 'number' && Number.isFinite(source.priority)
      ? Math.max(0, Math.trunc(source.priority))
      : 100,
  tags: uniqueStringList(source.tags ?? []),
  ...(source.snippetNames?.length
    ? { snippetNames: uniqueStringList(source.snippetNames) }
    : {}),
});

const normalizeManifest = (
  raw: z.infer<typeof docsManifestSchema>,
  warnings: string[],
): AiPathsDocsManifest => {
  const seenIds = new Set<string>();
  const sources: AiPathsDocsManifestSource[] = [];
  raw.sources.forEach((source) => {
    const normalized = normalizeManifestSource(source);
    if (seenIds.has(normalized.id)) {
      warnings.push(
        `Manifest source id "${normalized.id}" is duplicated and later entries are ignored.`,
      );
      return;
    }
    seenIds.add(normalized.id);
    sources.push(normalized);
  });
  return {
    version: raw.version?.trim() || '1.0.0',
    sources,
  };
};

const readAiPathsDocsManifest = async (
  warnings: string[],
): Promise<AiPathsDocsManifest> => {
  const absolutePath = path.resolve(process.cwd(), DOCS_MANIFEST_PATH);
  try {
    const manifestText = await readFile(absolutePath, 'utf8');
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(manifestText);
    } catch {
      warnings.push(`${DOCS_MANIFEST_PATH}: invalid JSON. Falling back to built-in sources.`);
      return LEGACY_FALLBACK_MANIFEST;
    }
    const result = docsManifestSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: schema validation failed. Falling back to built-in sources.`,
      );
      return LEGACY_FALLBACK_MANIFEST;
    }
    const normalized = normalizeManifest(result.data, warnings);
    if (normalized.sources.length === 0) {
      warnings.push(
        `${DOCS_MANIFEST_PATH}: no valid sources enabled. Falling back to built-in sources.`,
      );
      return LEGACY_FALLBACK_MANIFEST;
    }
    return normalized;
  } catch (error) {
    warnings.push(
      `${DOCS_MANIFEST_PATH}: failed to read manifest (${error instanceof Error ? error.message : 'unknown error'}). Falling back to built-in sources.`,
    );
    return LEGACY_FALLBACK_MANIFEST;
  }
};

const sortManifestSources = (
  sources: AiPathsDocsManifestSource[],
): AiPathsDocsManifestSource[] =>
  sources
    .slice()
    .sort((left, right) => {
      if (left.priority !== right.priority) return left.priority - right.priority;
      return left.id.localeCompare(right.id);
    });

const mergeAssertionSourceMetadata = (
  assertion: AiPathsDocAssertion,
  source: AiPathsDocsManifestSource,
): AiPathsDocAssertion => {
  const mergedTags = uniqueStringList([
    ...(assertion.tags ?? []),
    ...(source.tags ?? []),
  ]);
  return {
    ...assertion,
    ...(mergedTags.length > 0 ? { tags: mergedTags } : {}),
    sourceId: source.id,
    sourcePriority: source.priority,
  };
};

const addAssertionsWithDedup = (args: {
  source: AiPathsDocsManifestSource;
  assertions: AiPathsDocAssertion[];
  assertionById: Map<string, AiPathsDocAssertion>;
  warnings: string[];
}): void => {
  const { source, assertions, assertionById, warnings } = args;
  assertions.forEach((assertion: AiPathsDocAssertion) => {
    const existing = assertionById.get(assertion.id);
    if (existing) {
      warnings.push(
        `Assertion id "${assertion.id}" from source "${source.id}" duplicates "${existing.sourceId ?? existing.sourcePath}" and was ignored.`,
      );
      return;
    }
    assertionById.set(assertion.id, mergeAssertionSourceMetadata(assertion, source));
  });
};

const buildMarkdownSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const hash = hashText(content);
    const extracted = extractAiPathsAssertionsFromMarkdown(content, source.path, hash);
    extracted.warnings.forEach((warning) => warnings.push(warning));
    return {
      hash,
      assertions: extracted.assertions,
    };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read markdown source (${error instanceof Error ? error.message : 'unknown error'}).`,
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

const buildNodeCatalogSourcePayload = (
  source: AiPathsDocsManifestSource,
): { hash: string; assertions: AiPathsDocAssertion[] } => {
  const sourceHash = hashText(JSON.stringify(AI_PATHS_NODE_DOCS));
  const assertions = buildNodeDocsCatalogAssertions().map(
    (assertion: AiPathsDocAssertion): AiPathsDocAssertion => ({
      ...assertion,
      sourcePath: source.path,
      sourceHash,
      sourceType: 'node_docs_catalog',
    }),
  );
  return {
    hash: sourceHash,
    assertions,
  };
};

const buildSnippetSourcePayload = (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): { hash: string; assertions: AiPathsDocAssertion[]; snippetNames: string[] } => {
  const { source, warnings } = args;
  const snippetNames = uniqueStringList(
    source.snippetNames?.length ? source.snippetNames : Object.keys(DOCS_SNIPPET_REGISTRY),
  );
  const validSnippetNames = snippetNames.filter((snippetName: string): boolean => {
    const exists = Boolean(DOCS_SNIPPET_REGISTRY[snippetName]);
    if (!exists) {
      warnings.push(
        `Snippet source "${source.id}" references unknown snippet "${snippetName}".`,
      );
    }
    return exists;
  });
  const snippetsRaw = validSnippetNames
    .map(
      (snippetName: string) =>
        `${snippetName}\n${DOCS_SNIPPET_REGISTRY[snippetName] || ''}`,
    )
    .join('\n');
  const hash = hashText(snippetsRaw);
  const assertions = validSnippetNames.flatMap((snippetName: string) =>
    parseSnippetWiringAssertions(
      snippetName,
      DOCS_SNIPPET_REGISTRY[snippetName] || '',
      hash,
    ).map((assertion: AiPathsDocAssertion): AiPathsDocAssertion => ({
      ...assertion,
      sourcePath: source.path,
      sourceType: 'docs_snippet',
      sourceHash: hash,
    })),
  );
  return {
    hash,
    assertions,
    snippetNames: validSnippetNames,
  };
};

const buildSemanticNodesCatalogSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const result = z.array(semanticNodeIndexRowSchema).safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${source.path}: semantic nodes catalog schema validation failed.`,
      );
      return {
        hash: hashText(`parse_error:${source.path}`),
        assertions: [],
      };
    }

    const rows = result.data;
    const allowedNodeTypes = uniqueStringList(rows.map((row) => row.nodeType));
    const nodeHashSet = new Set<string>();
    const nodeTypesByHash = new Map<string, string>();
    rows.forEach((row) => {
      nodeHashSet.add(row.nodeHash);
      const existingType = nodeTypesByHash.get(row.nodeHash);
      if (existingType && existingType !== row.nodeType) {
        warnings.push(
          `${source.path}: semantic node hash collision between "${existingType}" and "${row.nodeType}".`,
        );
        return;
      }
      nodeTypesByHash.set(row.nodeHash, row.nodeType);
    });
    const hash = hashText(JSON.stringify(rows));
    const docsBinding = source.path;

    const assertions: AiPathsDocAssertion[] = [
      {
        id: 'semantic.catalog.node_types_known',
        title: 'Node types are known in semantic catalog',
        module: 'graph',
        severity: 'error',
        description:
          `All node types in graph should resolve to known semantic catalog node definitions (catalog node hashes: ${nodeHashSet.size}).`,
        recommendation:
          'Replace unknown node types with supported node types listed in semantic grammar docs.',
        sequenceHint: 15,
        weight: 56,
        forceProbabilityIfFailed: 0,
        confidence: 0.88,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'node-types'],
        conditions: [
          {
            operator: 'node_types_known',
            list: allowedNodeTypes,
          },
        ],
      },
      {
        id: 'semantic.catalog.node_ids_unique',
        title: 'Node IDs are unique',
        module: 'graph',
        severity: 'error',
        description:
          'Semantic graph nodes should have unique IDs to avoid wiring collisions.',
        recommendation: 'Regenerate or rename duplicated node IDs.',
        sequenceHint: 16,
        weight: 54,
        forceProbabilityIfFailed: 0,
        confidence: 0.86,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'node-ids'],
        conditions: [
          {
            operator: 'node_ids_unique',
          },
        ],
      },
      {
        id: 'semantic.catalog.edge_ids_unique',
        title: 'Edge IDs are unique',
        module: 'graph',
        severity: 'error',
        description:
          'Semantic graph edges should have unique IDs for deterministic graph updates.',
        recommendation: 'Regenerate duplicated edge IDs or rebuild duplicated edges.',
        sequenceHint: 17,
        weight: 50,
        forceProbabilityIfFailed: 0,
        confidence: 0.84,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'edge-ids'],
        conditions: [
          {
            operator: 'edge_ids_unique',
          },
        ],
      },
      {
        id: 'semantic.catalog.node_positions_finite',
        title: 'Node positions are finite',
        module: 'graph',
        severity: 'warning',
        description:
          'Node positions should be finite numbers for reliable canvas rendering and export.',
        recommendation: 'Reset invalid node positions and re-save the path.',
        sequenceHint: 18,
        weight: 18,
        confidence: 0.72,
        sourcePath: source.path,
        sourceType: 'semantic_nodes_catalog',
        sourceHash: hash,
        docsBindings: [docsBinding],
        tags: ['semantic-grammar', 'catalog', 'canvas'],
        conditions: [
          {
            operator: 'node_positions_finite',
          },
        ],
      },
    ];

    return { hash, assertions };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read semantic nodes catalog (${error instanceof Error ? error.message : 'unknown error'}).`,
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

const buildTooltipDocsCatalogSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsed = JSON.parse(content) as unknown;
    const result = z.array(tooltipCatalogEntrySchema).safeParse(parsed);
    if (!result.success) {
      warnings.push(
        `${source.path}: tooltip catalog schema validation failed.`,
      );
      return {
        hash: hashText(`parse_error:${source.path}`),
        assertions: [],
      };
    }
    const entries = result.data;
    const hash = hashText(JSON.stringify(entries));
    const docsBinding = source.path;
    const hasRegexTooltipBundle = [
      'regex_placeholder_text',
      'regex_placeholder_lines',
      'regex_placeholder_value',
    ].every((id) => entries.some((entry) => entry.id === id));
    if (!hasRegexTooltipBundle) {
      return { hash, assertions: [] };
    }
    return {
      hash,
      assertions: [
        {
          id: 'tooltip.regex.ai_prompt_supported_placeholders',
          title: 'Regex AI prompt uses supported placeholders',
          module: 'parser',
          severity: 'warning',
          appliesToNodeTypes: ['regex'],
          description:
            'Regex AI prompt templates should use documented placeholders: {{text}}, {{lines}}, or {{value}}.',
          recommendation:
            'Include at least one supported placeholder in regex.aiPrompt or leave aiPrompt empty.',
          sequenceHint: 266,
          weight: 14,
          confidence: 0.74,
          sourcePath: source.path,
          sourceType: 'tooltip_docs_catalog',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: ['tooltip', 'regex', 'prompt-template'],
          conditionMode: 'any',
          conditions: [
            {
              operator: 'non_empty',
              field: 'config.regex.aiPrompt',
              negate: true,
            },
            {
              operator: 'matches_regex',
              field: 'config.regex.aiPrompt',
              expected: '\\{\\{(text|lines|value)\\}\\}',
            },
          ],
        },
      ],
    };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read tooltip catalog (${error instanceof Error ? error.message : 'unknown error'}).`,
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

const buildCoverageMatrixSourcePayload = async (args: {
  source: AiPathsDocsManifestSource;
  warnings: string[];
}): Promise<{ hash: string; assertions: AiPathsDocAssertion[] }> => {
  const { source, warnings } = args;
  const absolutePath = path.resolve(process.cwd(), source.path);
  try {
    const content = await readFile(absolutePath, 'utf8');
    const parsedRows = parseCsvRecords(content);
    const rows = parsedRows
      .map((row: Record<string, string>, index: number): CoverageMatrixRow | null => {
        const result = coverageMatrixRowSchema.safeParse(row);
        if (!result.success) {
          warnings.push(
            `${source.path}: coverage row ${index + 2} failed schema validation and was ignored.`,
          );
          return null;
        }
        return result.data;
      })
      .filter((row: CoverageMatrixRow | null): row is CoverageMatrixRow => row !== null);
    const hash = hashText(JSON.stringify(rows));
    const docsBinding = source.path;
    const assertions: AiPathsDocAssertion[] = [];
    const seen = new Set<string>();
    const nodeDocsByType = new Map(
      AI_PATHS_NODE_DOCS.map((doc) => [doc.type, doc]),
    );

    const pushAssertion = (assertion: AiPathsDocAssertion): void => {
      if (seen.has(assertion.id)) return;
      seen.add(assertion.id);
      assertions.push(assertion);
    };

    rows.forEach((row: CoverageMatrixRow) => {
      const nodeType = row.node_type.trim();
      if (!nodeType) return;
      const normalizedCoverage = normalizeCoverageDimension(row.coverage_status);
      if (nodeType === 'cross_graph_invariants') {
        pushAssertion({
          id: 'coverage.cross_graph.integrity_bundle',
          title: 'Cross-graph integrity bundle',
          module: 'graph',
          severity: 'warning',
          description:
            'Coverage matrix requires cross-graph invariants: unique IDs and resolvable, declared edge endpoints.',
          recommendation:
            'Fix duplicated node/edge IDs and reconnect dangling or invalid-port edges.',
          sequenceHint: 29,
          weight: 26,
          confidence: 0.8,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: ['coverage-matrix', 'cross-graph', normalizedCoverage],
          conditionMode: 'all',
          conditions: [
            { operator: 'node_ids_unique' },
            { operator: 'edge_ids_unique' },
            { operator: 'edge_endpoints_resolve' },
            { operator: 'edge_ports_declared' },
          ],
        });
        return;
      }

      const nodeDoc = nodeDocsByType.get(nodeType as (typeof AI_PATHS_NODE_DOCS)[number]['type']);
      if (!nodeDoc) {
        warnings.push(
          `${source.path}: coverage row "${nodeType}" has no matching node docs entry.`,
        );
        return;
      }
      const module = toModuleFromNodeType(nodeType);
      const baseTags = ['coverage-matrix', nodeType, normalizedCoverage];
      const noteText = row.notes?.trim();
      const wiringState = normalizeCoverageDimension(row.wiring_integrity);
      const configState = normalizeCoverageDimension(row.config_completeness);
      const runtimeState = normalizeCoverageDimension(row.runtime_safety);
      const providerState = normalizeCoverageDimension(row.provider_compatibility);
      const asyncState = normalizeCoverageDimension(row.async_correctness);
      const persistenceState = normalizeCoverageDimension(row.persistence_safety);

      if ((configState === 'yes' || configState === 'partial') && nodeDoc.config.length > 0) {
        pushAssertion({
          id: `coverage.${nodeType}.config.object_non_empty`,
          title: `${nodeDoc.title}: config object should not be empty`,
          module,
          severity: coverageDimensionSeverity(configState, normalizedCoverage),
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix config-completeness signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for config completeness checks.`,
          recommendation: 'Set required config fields for this node type before runtime execution.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 270,
          confidence: configState === 'yes' ? 0.62 : 0.5,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'config-completeness'],
          conditions: [
            {
              operator: 'non_empty',
              field: 'config',
            },
          ],
        });
      }

      if (
        (wiringState === 'yes' || wiringState === 'partial') &&
        nodeDoc.inputs.length > 0 &&
        nodeType !== 'trigger' &&
        nodeType !== 'simulation'
      ) {
        pushAssertion({
          id: `coverage.${nodeType}.wiring.has_incoming`,
          title: `${nodeDoc.title}: receives upstream data`,
          module,
          severity: coverageDimensionSeverity(wiringState, normalizedCoverage),
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix wiring signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for wiring integrity checks.`,
          recommendation: 'Connect at least one upstream edge into this node type.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 272,
          confidence: wiringState === 'yes' ? 0.57 : 0.46,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'wiring-integrity', 'incoming'],
          conditions: [
            {
              operator: 'has_incoming_port',
            },
          ],
        });
      }

      if (
        (wiringState === 'yes' || wiringState === 'partial') &&
        nodeDoc.outputs.length > 0 &&
        nodeType !== 'viewer'
      ) {
        pushAssertion({
          id: `coverage.${nodeType}.wiring.has_outgoing`,
          title: `${nodeDoc.title}: emits downstream data`,
          module,
          severity: 'info',
          description:
            noteText && noteText.length > 0
              ? `Coverage matrix downstream wiring signal for ${nodeDoc.title}. ${noteText}`
              : `Coverage matrix marks ${nodeDoc.title} for downstream wiring checks.`,
          recommendation: 'Connect at least one outgoing edge from this node type.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 273,
          confidence: wiringState === 'yes' ? 0.53 : 0.44,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'wiring-integrity', 'outgoing'],
          conditions: [
            {
              operator: 'has_outgoing_port',
            },
          ],
        });
      }

      const runtimeWaitField = nodeDoc.config.find(
        (field) => field.path === 'runtime.waitForInputs',
      );
      if ((runtimeState === 'yes' || runtimeState === 'partial') && runtimeWaitField) {
        pushAssertion({
          id: `coverage.${nodeType}.runtime.wait_for_inputs_explicit`,
          title: `${nodeDoc.title}: runtime wait-for-inputs is explicit`,
          module,
          severity: coverageDimensionSeverity(runtimeState, normalizedCoverage),
          description:
            'Coverage matrix runtime-safety signal requires explicit wait-for-inputs behavior for deterministic execution.',
          recommendation: 'Set `config.runtime.waitForInputs` explicitly to true or false.',
          appliesToNodeTypes: [nodeType],
          sequenceHint: 274,
          confidence: runtimeState === 'yes' ? 0.56 : 0.45,
          sourcePath: source.path,
          sourceType: 'coverage_matrix_csv',
          sourceHash: hash,
          docsBindings: [docsBinding],
          tags: [...baseTags, 'runtime-safety'],
          conditions: [
            {
              operator: 'exists',
              field: 'config.runtime.waitForInputs',
            },
          ],
        });
      }

      const providerField = nodeDoc.config.find((field) =>
        /\.provider$/i.test(field.path),
      );
      if ((providerState === 'yes' || providerState === 'partial') && providerField) {
        const providerValues = inferEnumListFromDescription(
          providerField.path,
          providerField.description,
          providerField.defaultValue,
        );
        if (providerValues.length >= 2) {
          pushAssertion({
            id: `coverage.${nodeType}.${sanitizeFieldPathForId(providerField.path)}.provider_values`,
            title: `${nodeDoc.title}: provider uses documented values`,
            module,
            severity: coverageDimensionSeverity(providerState, normalizedCoverage),
            description:
              'Coverage matrix provider-compatibility signal enforces documented provider values.',
            recommendation: `Set config.${providerField.path} to one of: ${providerValues.join(', ')}.`,
            appliesToNodeTypes: [nodeType],
            sequenceHint: 275,
            confidence: providerState === 'yes' ? 0.6 : 0.48,
            sourcePath: source.path,
            sourceType: 'coverage_matrix_csv',
            sourceHash: hash,
            docsBindings: [docsBinding],
            tags: [...baseTags, 'provider-compatibility'],
            conditions: [
              {
                operator: 'in',
                field: `config.${providerField.path}`,
                list: providerValues,
              },
            ],
          });
        }
      }

      if (asyncState === 'yes' || asyncState === 'partial') {
        const asyncField = nodeDoc.config.find((field) =>
          /(interval|maxattempts|maxsteps|timeout|waitforinputs)/i.test(field.path),
        );
        if (asyncField) {
          pushAssertion({
            id: `coverage.${nodeType}.${sanitizeFieldPathForId(asyncField.path)}.async_non_empty`,
            title: `${nodeDoc.title}: async control field is configured`,
            module,
            severity: coverageDimensionSeverity(asyncState, normalizedCoverage),
            description:
              'Coverage matrix async-correctness signal requires explicit async control configuration.',
            recommendation: `Set config.${asyncField.path} to a deterministic value.`,
            appliesToNodeTypes: [nodeType],
            sequenceHint: 276,
            confidence: asyncState === 'yes' ? 0.55 : 0.44,
            sourcePath: source.path,
            sourceType: 'coverage_matrix_csv',
            sourceHash: hash,
            docsBindings: [docsBinding],
            tags: [...baseTags, 'async-correctness'],
            conditions: [
              {
                operator: 'non_empty',
                field: `config.${asyncField.path}`,
              },
            ],
          });
        }
      }

      if (persistenceState === 'yes' || persistenceState === 'partial') {
        const persistenceFields = nodeDoc.config
          .filter((field) =>
            /(dryrun|skipempty|trimstrings|updatetemplate|writesource)/i.test(field.path),
          )
          .slice(0, 2);
        persistenceFields.forEach((field, index) => {
          pushAssertion({
            id: `coverage.${nodeType}.${sanitizeFieldPathForId(field.path)}.persistence_exists`,
            title: `${nodeDoc.title}: persistence safety field is explicit`,
            module,
            severity: 'info',
            description:
              'Coverage matrix persistence-safety signal requires explicit persistence behavior fields.',
            recommendation: `Set config.${field.path} explicitly for predictable writes.`,
            appliesToNodeTypes: [nodeType],
            sequenceHint: 277 + index,
            confidence: persistenceState === 'yes' ? 0.52 : 0.42,
            sourcePath: source.path,
            sourceType: 'coverage_matrix_csv',
            sourceHash: hash,
            docsBindings: [docsBinding],
            tags: [...baseTags, 'persistence-safety'],
            conditions: [
              {
                operator: 'exists',
                field: `config.${field.path}`,
              },
            ],
          });
        });
      }
    });
    return { hash, assertions };
  } catch (error) {
    warnings.push(
      `${source.path}: failed to read coverage matrix (${error instanceof Error ? error.message : 'unknown error'}).`,
    );
    return {
      hash: hashText(`read_error:${source.path}`),
      assertions: [],
    };
  }
};

export const buildAiPathsValidationDocsSnapshot = async (): Promise<AiPathsDocsSnapshot> => {
  const warnings: string[] = [];
  const sources: AiPathsDocsSnapshotSource[] = [];
  const assertionById = new Map<string, AiPathsDocAssertion>();
  const manifest = await readAiPathsDocsManifest(warnings);
  const enabledSources = sortManifestSources(
    manifest.sources.filter((source: AiPathsDocsManifestSource): boolean => source.enabled),
  );

  for (const source of enabledSources) {
    if (source.type === 'markdown_assertion') {
      const markdownPayload = await buildMarkdownSourcePayload({ source, warnings });
      addAssertionsWithDedup({
        source,
        assertions: markdownPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: markdownPayload.hash,
        assertionCount: markdownPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'node_docs_catalog') {
      const catalogPayload = buildNodeCatalogSourcePayload(source);
      addAssertionsWithDedup({
        source,
        assertions: catalogPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: catalogPayload.hash,
        assertionCount: catalogPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'docs_snippet') {
      const snippetPayload = buildSnippetSourcePayload({ source, warnings });
      addAssertionsWithDedup({
        source,
        assertions: snippetPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: snippetPayload.hash,
        assertionCount: snippetPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
        ...(snippetPayload.snippetNames.length > 0
          ? { snippetNames: snippetPayload.snippetNames }
          : {}),
      });
      continue;
    }

    if (source.type === 'semantic_nodes_catalog') {
      const semanticPayload = await buildSemanticNodesCatalogSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: semanticPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: semanticPayload.hash,
        assertionCount: semanticPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'tooltip_docs_catalog') {
      const tooltipPayload = await buildTooltipDocsCatalogSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: tooltipPayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: tooltipPayload.hash,
        assertionCount: tooltipPayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
      continue;
    }

    if (source.type === 'coverage_matrix_csv') {
      const coveragePayload = await buildCoverageMatrixSourcePayload({
        source,
        warnings,
      });
      addAssertionsWithDedup({
        source,
        assertions: coveragePayload.assertions,
        assertionById,
        warnings,
      });
      sources.push({
        id: source.id,
        path: source.path,
        type: source.type,
        hash: coveragePayload.hash,
        assertionCount: coveragePayload.assertions.length,
        enabled: true,
        priority: source.priority,
        ...(source.tags.length > 0 ? { tags: source.tags } : {}),
      });
    }
  }

  const assertions = Array.from(assertionById.values()).sort((left, right) => {
    const leftSequence =
      typeof left.sequenceHint === 'number' && Number.isFinite(left.sequenceHint)
        ? left.sequenceHint
        : Number.MAX_SAFE_INTEGER;
    const rightSequence =
      typeof right.sequenceHint === 'number' && Number.isFinite(right.sequenceHint)
        ? right.sequenceHint
        : Number.MAX_SAFE_INTEGER;
    if (leftSequence !== rightSequence) return leftSequence - rightSequence;
    return left.id.localeCompare(right.id);
  });

  const generatedAt = new Date().toISOString();
  const snapshotHash = hashText(
    JSON.stringify({
      manifestVersion: manifest.version,
      sources: sources.map((source) => ({
        id: source.id,
        hash: source.hash,
        priority: source.priority,
      })),
      warnings,
      assertions: assertions.map((assertion) => ({
        id: assertion.id,
        sourceId: assertion.sourceId,
        sourcePath: assertion.sourcePath,
        sourceHash: assertion.sourceHash,
      })),
    }),
  );

  return {
    generatedAt,
    snapshotHash,
    sources,
    warnings,
    assertions,
  };
};
