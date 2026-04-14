import { z } from 'zod';

import { aiNodeSchema, edgeSchema } from '@/shared/contracts/ai-paths';
import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
} from '@/shared/lib/ai-paths/core/constants';
import { stableStringify } from '@/shared/lib/ai-paths/core/utils';
import { normalizeAiPathFolderPath } from '@/shared/lib/ai-paths/core/utils/path-folders';

import type { RunEnqueuePayloadIssue as PathSavePayloadIssue } from './runtime/payload-validation';

const normalizeHistoryRetentionValue = (value: unknown, fallback: number): number => {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
    return fallback;
  }
  return Math.min(
    AI_PATHS_HISTORY_RETENTION_MAX,
    Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
  );
};

export const normalizeHistoryRetentionPasses = (value: unknown): number =>
  normalizeHistoryRetentionValue(value, AI_PATHS_HISTORY_RETENTION_DEFAULT);

export const normalizeHistoryRetentionOptionsMax = (value: unknown): number =>
  normalizeHistoryRetentionValue(value, AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT);

export const normalizeConfigForHash = (config: PathConfig): PathConfig => ({
  ...config,
  nodes: [...config.nodes].sort((a: AiNode, b: AiNode): number => a.id.localeCompare(b.id)),
  edges: [...config.edges].sort((a: Edge, b: Edge): number => a.id.localeCompare(b.id)),
});

export const stripNodeConfig = (items: AiNode[]): AiNode[] =>
  items.map((node: AiNode): AiNode => {
    if (!node.config) {
      return { ...node };
    }
    return { ...node, config: undefined };
  });

export const buildNodesForAutoSave = (
  baseNodes: AiNode[],
  activePathId: string | null,
  pathConfigs: Record<string, PathConfig>
): AiNode[] => {
  const savedNodes = activePathId ? (pathConfigs[activePathId]?.nodes ?? []) : [];
  const savedConfigById = new Map<string, AiNode['config']>(
    savedNodes.map((node: AiNode): [string, AiNode['config']] => [node.id, node.config])
  );
  return baseNodes.map((node: AiNode): AiNode => {
    if (savedConfigById.has(node.id)) {
      return { ...node, config: savedConfigById.get(node.id) };
    }
    return { ...node };
  });
};

export const mergeNodeOverride = (baseNodes: AiNode[], nodeOverride?: AiNode): AiNode[] => {
  if (!nodeOverride) {
    return baseNodes;
  }
  // Node override is an in-place edit path (node config dialog), not node creation.
  // Never append unknown ids here; that can create phantom duplicates and break save linting.
  return baseNodes.map(
    (node: AiNode): AiNode => (node.id === nodeOverride.id ? nodeOverride : node)
  );
};

export const resolvePathSaveBlockedMessage = (
  isPathLocked: boolean,
  _isPathActive: boolean
): string | null => {
  if (isPathLocked) {
    return 'This path is locked. Unlock it to save.';
  }
  // Deactivated paths are excluded from runs, but should remain editable/savable.
  return null;
};

const RAW_PATH_SAVE_MESSAGE_PATTERNS = [
  /ai path config contains/i,
  /invalid ai paths runtime state payload/i,
  /^invalid payload\b/i,
] as const;

export const shouldExposePathSaveRawMessage = (rawMessage: string): boolean => {
  const normalized = rawMessage.trim();
  if (!normalized) return false;
  return RAW_PATH_SAVE_MESSAGE_PATTERNS.some((pattern) => pattern.test(normalized));
};

export type PathNodeRoleLintResult = {
  duplicateRoleTypes: Array<{ type: string; count: number }>;
  modelCount: number;
  httpCount: number;
  errors: string[];
  warnings: string[];
};

export type { PathSavePayloadIssue };

const formatNodeType = (type: string): string => type.replace(/_/g, ' ');

export const lintPathNodeRoles = (nodes: AiNode[]): PathNodeRoleLintResult => {
  const counts = new Map<string, number>();
  nodes.forEach((node: AiNode) => {
    const type = typeof node.type === 'string' ? node.type.trim() : '';
    if (!type) return;
    counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  const duplicateRoleTypes = Array.from(counts.entries())
    .filter(([, count]: [string, number]) => count > 1)
    .map(([type, count]: [string, number]) => ({ type, count }))
    .sort((a, b): number => a.type.localeCompare(b.type));

  const errors = duplicateRoleTypes.map(
    ({ type, count }) =>
      `Path save blocked: duplicate node role "${formatNodeType(type)}" detected (${count}x).`
  );
  const modelCount = counts.get('model') ?? 0;
  const httpCount = counts.get('http') ?? 0;
  const warnings: string[] = [];
  if (modelCount > 1) {
    warnings.push(
      `Path budget warning: ${modelCount} model nodes configured (recommended maximum: 1).`
    );
  }
  if (httpCount > 1) {
    warnings.push(
      `Path budget warning: ${httpCount} HTTP nodes configured (recommended maximum: 1).`
    );
  }

  return {
    duplicateRoleTypes,
    modelCount,
    httpCount,
    errors,
    warnings,
  };
};

const pathSavePayloadSchema = z.object({
  nodes: z.array(aiNodeSchema),
  edges: z.array(edgeSchema),
});

const formatIssuePath = (segments: ReadonlyArray<PropertyKey>): string => {
  if (segments.length === 0) return '(root)';
  return segments
    .map((segment) => {
      if (typeof segment === 'symbol') {
        return segment.description ?? '(symbol)';
      }
      return String(segment);
    })
    .join('.');
};

export const collectInvalidPathSavePayloadIssues = (
  nodes: AiNode[],
  edges: Edge[]
): PathSavePayloadIssue[] => {
  const parsed = pathSavePayloadSchema.safeParse({ nodes, edges });
  if (parsed.success) return [];
  return parsed.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }));
};

export type PersistedNodeConfigMismatch = {
  reason: 'expected_node_missing' | 'persisted_node_missing' | 'config_mismatch';
  expectedNodeId: string;
  resolvedExpectedNodeId: string | null;
  persistedNodeId: string | null;
};

const hasSameNodeSignature = (left: AiNode, right: AiNode): boolean =>
  left.type === right.type &&
  left.title === right.title &&
  Number(left.position?.x ?? Number.NaN) === Number(right.position?.x ?? Number.NaN) &&
  Number(left.position?.y ?? Number.NaN) === Number(right.position?.y ?? Number.NaN);

const findNodeBySignature = (candidates: AiNode[], needle: AiNode): AiNode | undefined =>
  candidates.find((node: AiNode): boolean => hasSameNodeSignature(node, needle));

const resolveExpectedNodeByIdOrIndex = ({
  expectedNode,
  expectedNodes,
}: {
  expectedNode: AiNode;
  expectedNodes: AiNode[];
}): AiNode | undefined => {
  const expectedNodeIndex = expectedNodes.findIndex(
    (node: AiNode): boolean => node.id === expectedNode.id
  );
  const expectedNodeByIndex = expectedNodeIndex >= 0 ? expectedNodes[expectedNodeIndex] : undefined;

  return (
    expectedNodes.find((node: AiNode): boolean => node.id === expectedNode.id) ??
    (expectedNodeByIndex?.type === expectedNode.type ? expectedNodeByIndex : undefined)
  );
};

const resolveExpectedPersistedNode = ({
  expectedNode,
  expectedNodes,
}: {
  expectedNode: AiNode;
  expectedNodes: AiNode[];
}): AiNode | undefined =>
  resolveExpectedNodeByIdOrIndex({ expectedNode, expectedNodes }) ??
  findNodeBySignature(expectedNodes, expectedNode);

const resolvePersistedNodeByExpectedNode = ({
  persistedNodes,
  resolvedExpectedNode,
}: {
  persistedNodes: AiNode[];
  resolvedExpectedNode: AiNode;
}): AiNode | undefined =>
  persistedNodes.find((node: AiNode): boolean => node.id === resolvedExpectedNode.id) ??
  findNodeBySignature(persistedNodes, resolvedExpectedNode);

const hasMatchingPersistedNodeConfig = ({
  persistedNode,
  resolvedExpectedNode,
}: {
  persistedNode: AiNode;
  resolvedExpectedNode: AiNode;
}): boolean =>
  stableStringify(resolvedExpectedNode.config ?? null) ===
  stableStringify(persistedNode.config ?? null);

export const resolvePersistedNodeConfigMismatch = (args: {
  expectedNode: AiNode;
  expectedConfig: PathConfig;
  persistedConfig: PathConfig;
}): PersistedNodeConfigMismatch | null => {
  const expectedNodes = Array.isArray(args.expectedConfig.nodes) ? args.expectedConfig.nodes : [];
  const persistedNodes = Array.isArray(args.persistedConfig.nodes)
    ? args.persistedConfig.nodes
    : [];
  const resolvedExpectedNode = resolveExpectedPersistedNode({
    expectedNode: args.expectedNode,
    expectedNodes,
  });
  if (!resolvedExpectedNode) {
    return {
      reason: 'expected_node_missing',
      expectedNodeId: args.expectedNode.id,
      resolvedExpectedNodeId: null,
      persistedNodeId: null,
    };
  }

  const persistedNode = resolvePersistedNodeByExpectedNode({
    persistedNodes,
    resolvedExpectedNode,
  });
  if (!persistedNode) {
    return {
      reason: 'persisted_node_missing',
      expectedNodeId: args.expectedNode.id,
      resolvedExpectedNodeId: resolvedExpectedNode.id,
      persistedNodeId: null,
    };
  }

  if (hasMatchingPersistedNodeConfig({ persistedNode, resolvedExpectedNode })) {
    return null;
  }

  return {
    reason: 'config_mismatch',
    expectedNodeId: args.expectedNode.id,
    resolvedExpectedNodeId: resolvedExpectedNode.id,
    persistedNodeId: persistedNode.id,
  };
};

export const normalizeLoadedPathName = (_pathId: string, name: unknown): string => {
  return typeof name === 'string' ? name.trim() : '';
};

type NormalizedLoadedPathMeta = PathMeta & {
  createdAtInferred: boolean;
  updatedAtInferred: boolean;
};

const normalizeLoadedPathTimestamp = (
  value: unknown,
  fallbackValue: string
): { value: string; inferred: boolean } =>
  typeof value === 'string' && value.trim().length > 0
    ? { value, inferred: false }
    : { value: fallbackValue, inferred: true };

const normalizeLoadedPathMeta = (
  meta: PathMeta,
  fallbackTimestamp: string
): NormalizedLoadedPathMeta | null => {
  const id = typeof meta.id === 'string' ? meta.id.trim() : '';
  if (!id) return null;

  const normalizedCreatedAt = normalizeLoadedPathTimestamp(meta.createdAt, fallbackTimestamp);
  const normalizedUpdatedAt = normalizeLoadedPathTimestamp(
    meta.updatedAt,
    normalizedCreatedAt.value
  );
  return {
    ...meta,
    id,
    name: normalizeLoadedPathName(id, meta.name) || `Path ${id.slice(0, 6)}`,
    folderPath: normalizeAiPathFolderPath(meta.folderPath),
    createdAt: normalizedCreatedAt.value,
    updatedAt: normalizedUpdatedAt.value,
    createdAtInferred: normalizedCreatedAt.inferred,
    updatedAtInferred: normalizedUpdatedAt.inferred,
  };
};

const mergeNormalizedPathMeta = (
  existing: NormalizedLoadedPathMeta | undefined,
  nextMeta: NormalizedLoadedPathMeta
): NormalizedLoadedPathMeta => {
  if (!existing) return nextMeta;
  if (existing.updatedAtInferred !== nextMeta.updatedAtInferred) {
    return existing.updatedAtInferred ? nextMeta : existing;
  }

  const existingUpdatedAt = Date.parse(existing.updatedAt || '') || 0;
  const nextUpdatedAt = Date.parse(nextMeta.updatedAt || '') || 0;
  return nextUpdatedAt >= existingUpdatedAt ? nextMeta : existing;
};

const toPathMeta = ({
  createdAtInferred: _createdAtInferred,
  updatedAtInferred: _updatedAtInferred,
  ...meta
}: NormalizedLoadedPathMeta): PathMeta => meta;

export const normalizeLoadedPathMetas = (metas: PathMeta[]): PathMeta[] => {
  const byId = new Map<string, NormalizedLoadedPathMeta>();
  metas.forEach((meta: PathMeta) => {
    const normalizedMeta = normalizeLoadedPathMeta(meta, new Date().toISOString());
    if (!normalizedMeta) return;
    byId.set(normalizedMeta.id, mergeNormalizedPathMeta(byId.get(normalizedMeta.id), normalizedMeta));
  });

  return Array.from(byId.values())
    .map(toPathMeta)
    .sort((a: PathMeta, b: PathMeta): number => b.updatedAt.localeCompare(a.updatedAt));
};
