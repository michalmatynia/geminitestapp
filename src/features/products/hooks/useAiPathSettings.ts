'use client';

import {
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  migrateTriggerToFetcherGraph,
  normalizeNodes,
} from '@/shared/lib/ai-paths/core/normalization';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { repairPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils/node-identity';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
} from '@/shared/lib/ai-paths/settings-store-client';
import type { AiNode, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const AI_PATHS_SETTINGS_SELECTIVE_TIMEOUT_MS = 8_000;

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

const sanitizeLoadedPathConfig = (config: PathConfig): PathConfig => {
  const identityRepair = repairPathNodeIdentities(config, { palette });
  const repaired = identityRepair.config;
  const normalized = normalizeNodes(Array.isArray(repaired.nodes) ? repaired.nodes : []);
  const migrated = migrateTriggerToFetcherGraph(
    normalized,
    Array.isArray(repaired.edges) ? repaired.edges : []
  );
  const graphNodes = normalizeNodes(migrated.nodes);
  const graphEdges = sanitizeEdges(graphNodes, migrated.edges);
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
      if (Array.isArray(parsedIndex)) {
        settingsPathOrder = parsedIndex
          .map((meta: PathMeta) => meta?.id)
          .filter(
            (id: string | undefined): id is string => typeof id === 'string' && id.length > 0
          );
        parsedIndex.forEach((meta: PathMeta) => {
          if (!meta?.id) return;
          const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
          if (!configRaw) {
            configs[meta.id] = createDefaultPathConfig(meta.id);
            return;
          }
          try {
            const parsedConfig = JSON.parse(configRaw) as PathConfig;
            const mergedConfig: PathConfig = {
              ...createDefaultPathConfig(meta.id),
              ...parsedConfig,
              id: meta.id,
              name: parsedConfig?.name || meta.name || `Path ${meta.id}`,
            };
            configs[meta.id] = sanitizeLoadedPathConfig(mergedConfig);
          } catch {
            configs[meta.id] = createDefaultPathConfig(meta.id);
          }
        });
      }
    } catch {
      settingsPathOrder = [];
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
