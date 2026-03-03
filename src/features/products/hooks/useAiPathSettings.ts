'use client';

import {
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  backfillPathConfigNodeContracts,
  normalizeNodes,
} from '@/shared/lib/ai-paths/core/normalization';
import { migratePathConfigCollections } from '@/shared/lib/ai-paths/core/utils/collection-names';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { repairPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils/node-identity';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import { isAppError, validationError } from '@/shared/errors/app-error';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
} from '@/shared/lib/ai-paths/settings-store-client';
import type { AiNode, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import type { DatabaseOperation } from '@/shared/contracts/ai-paths-core';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const AI_PATHS_SETTINGS_SELECTIVE_TIMEOUT_MS = 8_000;

const isDatabaseOperation = (value: unknown): value is DatabaseOperation =>
  value === 'query' ||
  value === 'update' ||
  value === 'insert' ||
  value === 'delete' ||
  value === 'action' ||
  value === 'distinct';

const LEGACY_TRIGGER_DATA_PORTS = new Set(['context', 'meta', 'entityId', 'entityType']);

const resolvePreferredActivePathId = (
  data: { aiPathsActivePathId?: unknown } | null | undefined
): string | null =>
  typeof data?.aiPathsActivePathId === 'string' && data.aiPathsActivePathId.trim().length > 0
    ? data.aiPathsActivePathId.trim()
    : null;

export type PathSettingsResult = {
  configs: Record<string, PathConfig>;
  orderedConfigs: PathConfig[];
  pathOrder: string[];
  uiState: Record<string, unknown> | null;
  preferredActivePathId: string | null;
  settingsLoadMode: 'selective' | 'full';
};

export type FindTriggerPathOptions = {
  fallbackToAnyPath?: boolean;
  defaultTriggerEventId?: string;
  preferServerExecution?: boolean;
  requireServerExecution?: boolean;
};

const sanitizeLoadedDatabaseNode = (node: AiNode): AiNode => {
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
  if (Object.prototype.hasOwnProperty.call(databaseConfig, 'schemaSnapshot')) {
    throw validationError('AI Path config contains deprecated database schemaSnapshot.', {
      source: 'ai_paths.path_settings',
      reason: 'deprecated_database_schema_snapshot',
      nodeId: node.id,
    });
  }
  const queryConfig =
    databaseConfig['query'] && typeof databaseConfig['query'] === 'object'
      ? (databaseConfig['query'] as Record<string, unknown>)
      : null;
  const nextDatabaseConfig: Record<string, unknown> = { ...databaseConfig };
  if (queryConfig) {
    const provider = queryConfig['provider'];
    if (provider === 'all') {
      throw validationError(
        'AI Path config contains deprecated database query provider "all".',
        {
          source: 'ai_paths.path_settings',
          reason: 'deprecated_database_query_provider',
          nodeId: node.id,
          provider,
        }
      );
    }
    if (
      provider !== undefined &&
      provider !== 'auto' &&
      provider !== 'mongodb' &&
      provider !== 'prisma'
    ) {
      throw validationError('AI Path config contains invalid database query provider.', {
        source: 'ai_paths.path_settings',
        reason: 'invalid_database_query_provider',
        nodeId: node.id,
        provider,
      });
    }
    nextDatabaseConfig['query'] = {
      provider: provider ?? 'auto',
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
    };
  }
  return {
    ...node,
    config: {
      ...configRecord,
      database: {
        ...nextDatabaseConfig,
        operation: isDatabaseOperation(nextDatabaseConfig['operation'])
          ? nextDatabaseConfig['operation']
          : 'query',
      },
    },
  };
};

const resolveEdgeSourceNodeId = (edge: Record<string, unknown>): string => {
  const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';
  if (from) return from;
  const source = typeof edge['source'] === 'string' ? edge['source'].trim() : '';
  return source;
};

const resolveEdgeSourcePort = (edge: Record<string, unknown>): string => {
  const fromPort = typeof edge['fromPort'] === 'string' ? edge['fromPort'].trim() : '';
  if (fromPort) return fromPort;
  const sourceHandle =
    typeof edge['sourceHandle'] === 'string' ? edge['sourceHandle'].trim() : '';
  return sourceHandle;
};

const assertNoLegacyTriggerDataGraph = (nodes: AiNode[], edges: unknown[]): void => {
  const nodeById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );

  nodes.forEach((node: AiNode): void => {
    if (node.type !== 'trigger') return;
    const outputs = Array.isArray(node.outputs) ? node.outputs : [];
    const legacyPorts = outputs.filter((port: string): boolean => LEGACY_TRIGGER_DATA_PORTS.has(port));
    if (legacyPorts.length === 0) return;
    throw validationError('Legacy AI Paths trigger data outputs are no longer supported.', {
      source: 'ai_paths.path_settings',
      reason: 'deprecated_trigger_outputs',
      nodeId: node.id,
      outputs: legacyPorts,
    });
  });

  edges.forEach((edgeValue: unknown, index: number): void => {
    if (!edgeValue || typeof edgeValue !== 'object' || Array.isArray(edgeValue)) return;
    const edge = edgeValue as Record<string, unknown>;
    const sourceNodeId = resolveEdgeSourceNodeId(edge);
    const sourcePort = resolveEdgeSourcePort(edge);
    if (!sourceNodeId || !sourcePort) return;
    const sourceNode = nodeById.get(sourceNodeId);
    if (sourceNode?.type !== 'trigger') return;
    if (!LEGACY_TRIGGER_DATA_PORTS.has(sourcePort)) return;
    throw validationError('Legacy AI Paths trigger data edges are no longer supported.', {
      source: 'ai_paths.path_settings',
      reason: 'deprecated_trigger_data_edge',
      edgeIndex: index,
      edgeId: typeof edge['id'] === 'string' ? edge['id'] : null,
      sourceNodeId,
      sourcePort,
    });
  });
};

export const sanitizeLoadedPathConfig = (config: PathConfig): PathConfig => {
  const migratedConfig = migratePathConfigCollections(config).config;
  const contractBackfilledConfig = backfillPathConfigNodeContracts(migratedConfig).config;
  const sanitizedDatabaseNodes = (contractBackfilledConfig.nodes ?? []).map(
    sanitizeLoadedDatabaseNode
  );
  const identityRepair = repairPathNodeIdentities(
    {
      ...contractBackfilledConfig,
      nodes: sanitizedDatabaseNodes,
    },
    { palette }
  );
  const repaired = identityRepair.config;
  const normalized = normalizeNodes(Array.isArray(repaired.nodes) ? repaired.nodes : []);
  const rawEdges = Array.isArray(repaired.edges) ? repaired.edges : [];
  assertNoLegacyTriggerDataGraph(normalized, rawEdges);
  const graphNodes = normalizeNodes(normalized);
  const graphEdges = sanitizeEdges(graphNodes, rawEdges);
  return {
    ...repaired,
    nodes: graphNodes,
    edges: graphEdges,
  };
};

type FetchPathSettingsOptions = {
  forceFullLoad?: boolean;
};

const loadPathSettingsData = async (
  queryClient: QueryClient,
  args: {
    preferredActivePathId: string | null;
    forceFullLoad: boolean;
  }
): Promise<{
  settingsData: Array<{ key: string; value: string }>;
  settingsLoadMode: 'selective' | 'full';
}> => {
  if (args.preferredActivePathId && !args.forceFullLoad) {
    const preferredConfigKey = `${PATH_CONFIG_PREFIX}${args.preferredActivePathId}`;
    try {
      const selectiveSettings = await fetchAiPathsSettingsByKeysCached(
        [PATH_INDEX_KEY, AI_PATHS_UI_STATE_KEY, preferredConfigKey],
        { timeoutMs: AI_PATHS_SETTINGS_SELECTIVE_TIMEOUT_MS }
      );
      const hasPreferredConfig = selectiveSettings.some((item) => item.key === preferredConfigKey);
      if (hasPreferredConfig) {
        return { settingsData: selectiveSettings, settingsLoadMode: 'selective' };
      }
    } catch {
      // Fall through to full settings fetch.
    }
  }

  const queryKey = QUERY_KEYS.ai.aiPaths.settings();
  const settingsData = await fetchQueryV2<Array<{ key: string; value: string }>>(queryClient, {
    queryKey,
    queryFn: async () => {
      return await fetchAiPathsSettingsCached();
    },
    staleTime: AI_PATHS_SETTINGS_STALE_MS,
    meta: {
      source: 'ai.ai-paths.settings.fetchPathSettingsData',
      operation: 'list',
      resource: 'aiPaths.settings',
      domain: 'ai_paths',
      queryKey,
      tags: ['ai-paths', 'settings', 'fetch'],
    },
  })();
  return { settingsData, settingsLoadMode: 'full' };
};

export async function fetchPathSettings(
  queryClient: QueryClient,
  options: FetchPathSettingsOptions = {}
): Promise<PathSettingsResult> {
  const startedAt = Date.now();
  const cachedPreferences = queryClient.getQueryData<{ aiPathsActivePathId?: unknown }>(
    QUERY_KEYS.userPreferences.all
  );
  const preferredActivePathId = resolvePreferredActivePathId(cachedPreferences);
  const { settingsData, settingsLoadMode } = await loadPathSettingsData(queryClient, {
    preferredActivePathId,
    forceFullLoad: options.forceFullLoad === true,
  });

  const map = new Map<string, string>(
    settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
  );

  const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
  const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
  const uiState =
    uiStateParsed && typeof uiStateParsed === 'object'
      ? (uiStateParsed as Record<string, unknown>)
      : null;

  const configs: Record<string, PathConfig> = {};
  let settingsPathOrder: string[] = [];

  const indexRaw = map.get(PATH_INDEX_KEY);
  if (indexRaw) {
    try {
      const parsedIndex = JSON.parse(indexRaw) as PathMeta[];
      if (!Array.isArray(parsedIndex)) {
        throw validationError('Invalid AI Paths index payload.', {
          source: 'ai_paths.path_settings',
          reason: 'path_index_not_array',
        });
      }
      settingsPathOrder = parsedIndex
        .map((meta: PathMeta) => meta?.id)
        .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);
      parsedIndex.forEach((meta: PathMeta) => {
        if (!meta?.id) return;
        const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
        if (!configRaw) {
          throw validationError('AI Paths index references a missing path config payload.', {
            source: 'ai_paths.path_settings',
            reason: 'missing_path_config',
            pathId: meta.id,
          });
        }
        let parsedConfig: PathConfig;
        try {
          parsedConfig = JSON.parse(configRaw) as PathConfig;
        } catch (error) {
          throw validationError('Invalid AI Paths path config payload.', {
            source: 'ai_paths.path_settings',
            reason: 'path_config_json_parse_failed',
            pathId: meta.id,
            cause: error instanceof Error ? error.message : 'unknown_error',
          });
        }
        const mergedConfig: PathConfig = {
          ...createDefaultPathConfig(meta.id),
          ...parsedConfig,
          id: meta.id,
          name: parsedConfig?.name || meta.name || `Path ${meta.id}`,
        };
        configs[meta.id] = sanitizeLoadedPathConfig(mergedConfig);
      });
    } catch (error) {
      if (isAppError(error)) {
        throw error;
      }
      throw validationError('Invalid AI Paths settings payload.', {
        source: 'ai_paths.path_settings',
        reason: 'path_index_parse_failed',
        cause: error instanceof Error ? error.message : 'unknown_error',
      });
    }
  }

  if (Object.keys(configs).length === 0) {
    const fallback = createDefaultPathConfig('default');
    configs[fallback.id] = fallback;
    settingsPathOrder = [fallback.id];
  }

  const configsList: PathConfig[] = Object.values(configs);
  const orderedConfigs: PathConfig[] = settingsPathOrder.length
    ? settingsPathOrder
      .map((id: string) => configs[id])
      .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
    : configsList;

  const totalDurationMs = Date.now() - startedAt;
  if (totalDurationMs >= 250) {
    console.info('[ai-paths.products] fetchPathSettings timing', {
      totalDurationMs,
      settingsLoadMode,
      settingsRecordCount: settingsData.length,
      pathCount: orderedConfigs.length,
      preferredActivePathId,
      forceFullLoad: options.forceFullLoad === true,
    });
  }

  return {
    configs,
    orderedConfigs,
    pathOrder: settingsPathOrder,
    uiState,
    preferredActivePathId,
    settingsLoadMode,
  };
}

export function findTriggerPath(
  orderedConfigs: PathConfig[],
  uiState: Record<string, unknown> | null,
  preferredActivePathId: string | null,
  triggerEvent: string,
  options?: FindTriggerPathOptions
): PathConfig | undefined {
  const fallbackTriggerEventId =
    options?.defaultTriggerEventId ?? (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';
  const fallbackToAnyPath = options?.fallbackToAnyPath !== false;
  const preferServerExecution = options?.preferServerExecution === true;
  const requireServerExecution = options?.requireServerExecution === true;
  const activePathId =
    (typeof preferredActivePathId === 'string' && preferredActivePathId.trim().length > 0
      ? preferredActivePathId.trim()
      : null) ??
    (typeof uiState?.['activePathId'] === 'string' && uiState['activePathId'].trim().length > 0
      ? uiState['activePathId'].trim()
      : null);

  const pickPreferredCandidate = (candidates: PathConfig[]): PathConfig | undefined => {
    if (candidates.length === 0) return undefined;
    const activeCandidate = activePathId
      ? candidates.find((config: PathConfig): boolean => config.id === activePathId)
      : undefined;
    if (activeCandidate && activeCandidate.isActive !== false) {
      return activeCandidate;
    }
    return (
      candidates.find((config: PathConfig): boolean => config.isActive !== false) ??
      activeCandidate ??
      candidates[0]
    );
  };

  const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
    Array.isArray(config?.nodes)
      ? config.nodes.some(
        (node: AiNode) =>
          node.type === 'trigger' &&
            (node.config?.trigger?.event ?? fallbackTriggerEventId) === triggerEvent
      )
      : false
  );
  const serverTriggerCandidates = triggerCandidates.filter(
    (config: PathConfig): boolean => config.executionMode !== 'local'
  );
  const selectedTriggerCandidate = requireServerExecution
    ? pickPreferredCandidate(serverTriggerCandidates)
    : preferServerExecution
      ? (pickPreferredCandidate(serverTriggerCandidates) ??
        pickPreferredCandidate(triggerCandidates))
      : pickPreferredCandidate(triggerCandidates);
  if (selectedTriggerCandidate) return selectedTriggerCandidate;

  if (!fallbackToAnyPath) return undefined;
  const serverFallbackCandidates = orderedConfigs.filter(
    (config: PathConfig): boolean => config.executionMode !== 'local'
  );
  return requireServerExecution || preferServerExecution
    ? (pickPreferredCandidate(serverFallbackCandidates) ??
        (requireServerExecution ? undefined : pickPreferredCandidate(orderedConfigs)))
    : pickPreferredCandidate(orderedConfigs);
}
