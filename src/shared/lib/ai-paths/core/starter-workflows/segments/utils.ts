import type { PathConfig } from '@/shared/contracts/ai-paths';
import type { DatabaseOperation } from '@/shared/contracts/ai-paths-core';
import type { CanvasSemanticDocument } from '@/shared/contracts/ai-paths-semantic-grammar';
import type { AiTriggerButtonDisplay } from '@/shared/contracts/ai-trigger-buttons';
import { deserializeSemanticCanvasToPathConfig } from '@/shared/lib/ai-paths/core/semantic-grammar/deserialize';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import type {
  AiPathsStarterProvenance,
  AiPathTemplateRegistryEntry,
  CanonicalEdgeShape,
  CanonicalNodeShape,
  DeepValue,
} from './types';

export const STARTER_PROVENANCE_KEY = 'aiPathsStarter';

export const DATABASE_OPERATIONS = new Set<DatabaseOperation>([
  'query',
  'update',
  'insert',
  'delete',
  'action',
  'distinct',
]);

export const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
export const normalizeTextLower = (value: unknown): string => normalizeText(value).toLowerCase();

export const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  typeof value === 'string' && DATABASE_OPERATIONS.has(value as DatabaseOperation);

export const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const sortObjectDeep = (value: unknown): DeepValue => {
  if (Array.isArray(value)) {
    return value.map((entry: unknown): DeepValue => sortObjectDeep(entry));
  }
  if (!value || typeof value !== 'object') {
    return (value ?? null) as DeepValue;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record)
    .sort()
    .reduce<Record<string, DeepValue>>((acc, key) => {
      acc[key] = sortObjectDeep(record[key]);
      return acc;
    }, {});
};

export const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const buildCanonicalNodeShape = (node: unknown): CanonicalNodeShape => {
  const record = toRecord(node) ?? {};
  return {
    id: normalizeText(record['id']),
    type: normalizeText(record['type']),
    inputs: Array.isArray(record['inputs']) ? [...(record['inputs'] as string[])] : [],
    outputs: Array.isArray(record['outputs']) ? [...(record['outputs'] as string[])] : [],
    config: sortObjectDeep(toRecord(record['config']) ?? {}),
  };
};

export const buildCanonicalEdgeShape = (edge: unknown): CanonicalEdgeShape => {
  const record = toRecord(edge) ?? {};
  return {
    from: normalizeText(record['from']),
    to: normalizeText(record['to']),
    fromPort: normalizeText(record['fromPort']),
    toPort: normalizeText(record['toPort']),
  };
};

export const computeStarterWorkflowGraphHash = (
  config: Pick<PathConfig, 'nodes' | 'edges'>
): string => {
  const nodes = Array.isArray(config.nodes)
    ? config.nodes
      .map((node) => buildCanonicalNodeShape(node))
      .sort((left, right) => String(left.id).localeCompare(String(right.id)))
    : [];
  const edges = Array.isArray(config.edges)
    ? config.edges
      .map((edge) => buildCanonicalEdgeShape(edge))
      .sort((left, right) =>
        [String(left.from), String(left.to), String(left.fromPort), String(left.toPort)]
          .join('|')
          .localeCompare(
            [
              String(right.from),
              String(right.to),
              String(right.fromPort),
              String(right.toPort),
            ].join('|')
          )
      )
    : [];
  return hashString(JSON.stringify(sortObjectDeep({ nodes, edges })));
};

export const buildTriggerDisplay = (label: string): AiTriggerButtonDisplay => ({
  label,
  showLabel: true,
});

export const applyStarterProvenance = (
  config: PathConfig,
  provenance: AiPathsStarterProvenance
): PathConfig => {
  const existingExtensions = toRecord(config.extensions) ?? {};
  return {
    ...config,
    extensions: {
      ...existingExtensions,
      [STARTER_PROVENANCE_KEY]: provenance,
    },
  };
};

export const readStarterProvenance = (config: PathConfig): AiPathsStarterProvenance | null => {
  const extensions = toRecord(config.extensions);
  const starter = toRecord(extensions?.[STARTER_PROVENANCE_KEY]);
  if (!starter) return null;
  const starterKey = normalizeText(starter['starterKey']);
  const templateId = normalizeText(starter['templateId']);
  const templateVersion =
    typeof starter['templateVersion'] === 'number' && Number.isFinite(starter['templateVersion'])
      ? starter['templateVersion']
      : null;
  if (!starterKey || !templateId || templateVersion === null) return null;
  return {
    starterKey,
    templateId,
    templateVersion,
    seededDefault: starter['seededDefault'] === true,
  };
};

export const materializeSemanticAsset = (
  asset: CanvasSemanticDocument,
  args: {
    pathId?: string;
    name?: string;
    description?: string;
    isActive?: boolean;
    isLocked?: boolean;
    updatedAt?: string;
  } = {}
): PathConfig => {
  const config = deserializeSemanticCanvasToPathConfig(asset);
  const repaired = {
    ...config,
    id: args.pathId ?? config.id,
    name: args.name ?? config.name,
    description: args.description ?? config.description,
    isActive: args.isActive ?? config.isActive,
    isLocked: args.isLocked ?? config.isLocked,
    updatedAt: args.updatedAt ?? config.updatedAt,
  };
  return {
    ...repaired,
    edges: sanitizeEdges(repaired.nodes ?? [], repaired.edges ?? []),
  };
};

export const hasNodeOfType = (
  config: PathConfig,
  type: string,
  matcher: (node: NonNullable<PathConfig['nodes']>[number]) => boolean
): boolean => (config.nodes ?? []).some((node) => node.type === type && matcher(node));

export const hasAliasMatch = (value: string, aliases: string[]): boolean => {
  const normalizedValue = normalizeTextLower(value);
  if (!normalizedValue) return false;
  return aliases.some((alias) => normalizedValue === normalizeTextLower(alias));
};

export const hasAliasOrTriggerMatch = (
  config: PathConfig,
  names: string[],
  triggers: string[]
): boolean =>
  hasAliasMatch(config.name ?? '', names) || hasAliasMatch(config.trigger ?? '', triggers);
