/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/lib/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
} from '@/shared/lib/ai-paths';

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
  return baseNodes.map((node: AiNode): AiNode =>
    node.id === nodeOverride.id ? nodeOverride : node
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

export type PathNodeRoleLintResult = {
  duplicateRoleTypes: Array<{ type: string; count: number }>;
  modelCount: number;
  httpCount: number;
  errors: string[];
  warnings: string[];
};

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

export const normalizeLoadedPathName = (_pathId: string, name: unknown): string => {
  return typeof name === 'string' ? name.trim() : '';
};

export const normalizeLoadedPathMetas = (metas: PathMeta[]): PathMeta[] => {
  const byId = new Map<string, PathMeta>();
  metas.forEach((meta: PathMeta) => {
    const id = typeof meta.id === 'string' ? meta.id.trim() : '';
    if (!id) return;
    const normalizedName = normalizeLoadedPathName(id, meta.name) || `Path ${id.slice(0, 6)}`;
    const fallbackTimestamp = new Date().toISOString();
    const normalizedCreatedAt =
      typeof meta.createdAt === 'string' && meta.createdAt.trim().length > 0
        ? meta.createdAt
        : fallbackTimestamp;
    const normalizedUpdatedAt =
      typeof meta.updatedAt === 'string' && meta.updatedAt.trim().length > 0
        ? meta.updatedAt
        : normalizedCreatedAt;
    const normalizedMeta: PathMeta = {
      ...meta,
      id,
      name: normalizedName,
      createdAt: normalizedCreatedAt,
      updatedAt: normalizedUpdatedAt,
    };
    const existing = byId.get(id);
    if (!existing) {
      byId.set(id, normalizedMeta);
      return;
    }
    const existingUpdatedAt = Date.parse(existing.updatedAt || '') || 0;
    const nextUpdatedAt = Date.parse(normalizedMeta.updatedAt || '') || 0;
    if (nextUpdatedAt >= existingUpdatedAt) {
      byId.set(id, normalizedMeta);
    }
  });

  return Array.from(byId.values()).sort((a: PathMeta, b: PathMeta): number =>
    b.updatedAt.localeCompare(a.updatedAt)
  );
};
