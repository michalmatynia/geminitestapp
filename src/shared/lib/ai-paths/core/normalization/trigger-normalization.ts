import {
  aiNodeSchema,
  edgeSchema,
  type AiNode,
  type PathConfig,
  type PathMeta,
} from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
} from '../constants';

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

export const normalizeHistoryRetentionPasses = (value: unknown): number => {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(typeof value === 'string' ? value : '', 10);
  if (!Number.isFinite(parsed) || parsed < AI_PATHS_HISTORY_RETENTION_MIN) {
    return AI_PATHS_HISTORY_RETENTION_DEFAULT;
  }
  return Math.min(
    AI_PATHS_HISTORY_RETENTION_MAX,
    Math.max(AI_PATHS_HISTORY_RETENTION_MIN, Math.trunc(parsed))
  );
};

export const resolveHistoryRetentionPasses = (
  settingsData: Array<{ key: string; value: string }>
): number => {
  const raw = settingsData.find(
    (item: { key: string; value: string }) => item.key === AI_PATHS_HISTORY_RETENTION_KEY
  )?.value;
  return normalizeHistoryRetentionPasses(raw);
};

const assertNoDeprecatedTriggerDatabaseConfig = (node: AiNode): void => {
  if (node.type !== 'database' || !node.config || typeof node.config !== 'object') return;
  const configRecord = node.config as Record<string, unknown>;
  const databaseConfig =
    configRecord['database'] && typeof configRecord['database'] === 'object'
      ? (configRecord['database'] as Record<string, unknown>)
      : null;
  if (!databaseConfig) return;

  if (Object.prototype.hasOwnProperty.call(databaseConfig, 'schemaSnapshot')) {
    throw validationError('AI Path trigger payload contains unsupported database schemaSnapshot.', {
      source: 'ai_paths.trigger_payload',
      reason: 'unsupported_database_schema_snapshot',
      nodeId: node.id,
    });
  }

  const queryConfig =
    databaseConfig['query'] && typeof databaseConfig['query'] === 'object'
      ? (databaseConfig['query'] as Record<string, unknown>)
      : null;
  if (queryConfig?.['provider'] === 'all') {
    throw validationError(
      'AI Path trigger payload contains unsupported database query provider "all".',
      {
        source: 'ai_paths.trigger_payload',
        reason: 'unsupported_database_query_provider',
        nodeId: node.id,
        provider: queryConfig['provider'],
      }
    );
  }
};

export const sanitizeTriggerPathConfig = (config: PathConfig): PathConfig => {
  const graphNodes = (Array.isArray(config.nodes) ? config.nodes : []).map(
    (node: AiNode, index: number): AiNode => {
      assertNoDeprecatedTriggerDatabaseConfig(node);
      const parsedNode = aiNodeSchema.safeParse(node);
      if (!parsedNode.success) {
        throw validationError('Invalid AI Path trigger node payload.', {
          source: 'ai_paths.trigger_payload',
          reason: 'invalid_node',
          index,
          issues: parsedNode.error.flatten(),
        });
      }
      return parsedNode.data;
    }
  );

  const graphEdges = (Array.isArray(config.edges) ? config.edges : []).map(
    (edge: unknown, index: number) => {
      const parsedEdge = edgeSchema.safeParse(edge);
      if (!parsedEdge.success) {
        throw validationError('Invalid AI Path trigger edge payload.', {
          source: 'ai_paths.trigger_payload',
          reason: 'invalid_edge',
          index,
          issues: parsedEdge.error.flatten(),
        });
      }
      return parsedEdge.data;
    }
  );

  return {
    ...config,
    nodes: graphNodes,
    edges: graphEdges,
  };
};
