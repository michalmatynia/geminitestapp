import type { AiNode, Edge, PathConfig } from '@/features/ai/ai-paths/lib';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  AI_PATHS_HISTORY_RETENTION_OPTIONS_MAX_DEFAULT,
} from '@/features/ai/ai-paths/lib';

const normalizeHistoryRetentionValue = (value: unknown, fallback: number): number => {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(typeof value === 'string' ? value : '', 10);
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
  const savedNodes = activePathId ? pathConfigs[activePathId]?.nodes ?? [] : [];
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
  let replaced = false;
  const nextNodes = baseNodes.map((node: AiNode): AiNode => {
    if (node.id !== nodeOverride.id) {
      return node;
    }
    replaced = true;
    return nodeOverride;
  });
  return replaced ? nextNodes : [...nextNodes, nodeOverride];
};

export const resolvePathSaveBlockedMessage = (
  isPathLocked: boolean,
  isPathActive: boolean
): string | null => {
  if (isPathLocked) {
    return 'This path is locked. Unlock it to save.';
  }
  if (!isPathActive) {
    return 'This path is deactivated. Activate it to save.';
  }
  return null;
};
