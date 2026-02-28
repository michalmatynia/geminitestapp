import { z } from 'zod';
import type {
  AiPathsValidationModule,
  AiPathsValidationOperator,
  AiPathsValidationSeverity,
} from '@/shared/contracts/ai-paths';

export type AiPathsDocsManifestSourceType =
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
  sourceType: AiPathsDocsManifestSourceType;
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

export type AiPathsDocsManifestSource = {
  id: string;
  type: AiPathsDocsManifestSourceType;
  path: string;
  enabled: boolean;
  priority: number;
  tags: string[];
  snippetNames?: string[] | undefined;
};

export type AiPathsDocsManifest = {
  version: string;
  sources: AiPathsDocsManifestSource[];
};

export const docAssertionConditionSchema = z.object({
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

export const docAssertionSchema = z.object({
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

export const docsManifestSourceTypeSchema = z.enum([
  'markdown_assertion',
  'node_docs_catalog',
  'docs_snippet',
  'semantic_nodes_catalog',
  'tooltip_docs_catalog',
  'coverage_matrix_csv',
]);

export const docsManifestSourceSchema = z.object({
  id: z.string().trim().min(1),
  type: docsManifestSourceTypeSchema,
  path: z.string().trim().min(1),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  snippetNames: z.array(z.string()).optional(),
});

export const docsManifestSchema = z.object({
  version: z.string().trim().min(1).optional(),
  sources: z.array(docsManifestSourceSchema).min(1),
});

export const semanticNodeIndexRowSchema = z.object({
  nodeType: z.string().trim().min(1),
  title: z.string().trim().min(1),
  file: z.string().trim().min(1),
  nodeHash: z
    .string()
    .trim()
    .regex(/^[a-f0-9]{64}$/i),
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

export const tooltipCatalogEntrySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  section: z.string().trim().min(1),
  aliases: z.array(z.string().trim()).optional(),
  docPath: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  uiTargets: z.array(z.string().trim()).optional(),
});

export const coverageMatrixRowSchema = z.object({
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

export type CoverageMatrixDimensionValue = 'yes' | 'partial' | 'no' | 'n/a';
export type CoverageMatrixRow = z.infer<typeof coverageMatrixRowSchema>;
