import type { AiNode, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
} from '../constants';
import { palette } from '../definitions';
import {
  backfillPathConfigNodeContracts,
  migrateLegacyDbQueryProvider,
  migrateTriggerToFetcherGraph,
  normalizeNodes,
} from '../normalization';
import { migratePathConfigCollections } from '../utils/collection-names';
import { sanitizeEdges } from '../utils/graph';
import { repairPathNodeIdentities } from '../utils/node-identity';

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

export const normalizeTriggerNodeTimestamps = (
  nodes: AiNode[],
  fallbackTimestamp: string
): AiNode[] => {
  return nodes.map((node: AiNode): AiNode => {
    const createdAt =
      typeof node.createdAt === 'string' && node.createdAt.trim().length > 0
        ? node.createdAt
        : fallbackTimestamp;
    const updatedAt =
      typeof node.updatedAt === 'string' && node.updatedAt.trim().length > 0 ? node.updatedAt : null;
    return {
      ...node,
      createdAt,
      updatedAt,
    };
  });
};

export const sanitizeTriggerDatabaseNode = (node: AiNode): AiNode => {
  if (node.type !== 'database' || !node.config || typeof node.config !== 'object') {
    return node;
  }
  const configRecord = node.config as Record<string, unknown>;
  const databaseConfig =
    configRecord['database'] && typeof configRecord['database'] === 'object'
      ? (configRecord['database'] as Record<string, unknown>)
      : null;
  if (!databaseConfig) {
    return node;
  }
  const queryConfig =
    databaseConfig['query'] && typeof databaseConfig['query'] === 'object'
      ? (databaseConfig['query'] as Record<string, unknown>)
      : null;
  const nextDatabaseConfig: Record<string, unknown> = { ...databaseConfig };
  if (queryConfig) {
    nextDatabaseConfig['query'] = migrateLegacyDbQueryProvider({
      provider:
        queryConfig['provider'] === 'auto' ||
        queryConfig['provider'] === 'mongodb' ||
        queryConfig['provider'] === 'prisma'
          ? queryConfig['provider']
          : 'auto',
      collection:
        typeof queryConfig['collection'] === 'string' ? queryConfig['collection'] : 'products',
      mode:
        queryConfig['mode'] === 'preset' || queryConfig['mode'] === 'custom'
          ? queryConfig['mode']
          : 'custom',
      preset:
        queryConfig['preset'] === 'by_id' ||
        queryConfig['preset'] === 'by_productId' ||
        queryConfig['preset'] === 'by_entityId' ||
        queryConfig['preset'] === 'by_field'
          ? queryConfig['preset']
          : 'by_id',
      field: typeof queryConfig['field'] === 'string' ? queryConfig['field'] : '_id',
      idType:
        queryConfig['idType'] === 'string' || queryConfig['idType'] === 'objectId'
          ? queryConfig['idType']
          : 'string',
      queryTemplate:
        typeof queryConfig['queryTemplate'] === 'string' ? queryConfig['queryTemplate'] : '',
      limit:
        typeof queryConfig['limit'] === 'number' && Number.isFinite(queryConfig['limit'])
          ? queryConfig['limit']
          : 20,
      sort: typeof queryConfig['sort'] === 'string' ? queryConfig['sort'] : '',
      ...(typeof queryConfig['sortPresetId'] === 'string'
        ? { sortPresetId: queryConfig['sortPresetId'] }
        : {}),
      projection: typeof queryConfig['projection'] === 'string' ? queryConfig['projection'] : '',
      ...(typeof queryConfig['projectionPresetId'] === 'string'
        ? { projectionPresetId: queryConfig['projectionPresetId'] }
        : {}),
      single: queryConfig['single'] === true,
    });
  }
  delete nextDatabaseConfig['schemaSnapshot'];
  const operation = typeof nextDatabaseConfig['operation'] === 'string' ? nextDatabaseConfig['operation'] : 'query';
  return {
    ...node,
    config: {
      ...configRecord,
      database: {
        ...nextDatabaseConfig,
        operation,
      },
    },
  };
};

export const sanitizeTriggerPathConfig = (config: PathConfig): PathConfig => {
  const fallbackTimestamp =
    typeof config.updatedAt === 'string' && config.updatedAt.trim().length > 0
      ? config.updatedAt
      : new Date().toISOString();
  const migratedConfig = migratePathConfigCollections(config).config;
  const contractBackfilledConfig = backfillPathConfigNodeContracts(migratedConfig).config;
  const sanitizedDatabaseNodes = (contractBackfilledConfig.nodes ?? []).map(
    sanitizeTriggerDatabaseNode
  );
  const identityRepair = repairPathNodeIdentities(
    {
      ...contractBackfilledConfig,
      nodes: sanitizedDatabaseNodes,
    },
    { palette }
  );
  const repaired = identityRepair.config;
  const normalizedNodes = normalizeTriggerNodeTimestamps(
    normalizeNodes(Array.isArray(repaired.nodes) ? repaired.nodes : []),
    fallbackTimestamp
  );
  const migratedGraph = migrateTriggerToFetcherGraph(
    normalizedNodes,
    Array.isArray(repaired.edges) ? repaired.edges : []
  );
  const graphNodes = normalizeTriggerNodeTimestamps(normalizeNodes(migratedGraph.nodes), fallbackTimestamp);
  const graphEdges = sanitizeEdges(graphNodes, migratedGraph.edges);
  return {
    ...repaired,
    nodes: graphNodes,
    edges: graphEdges,
  };
};
