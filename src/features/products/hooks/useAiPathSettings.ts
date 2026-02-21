'use client';

import {
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/features/ai/ai-paths/lib/core/constants';
import {
  createDefaultPathConfig,
} from '@/features/ai/ai-paths/lib/core/utils/factory';
import { safeParseJson } from '@/features/ai/ai-paths/lib/core/utils/runtime';
import { fetchAiPathsSettingsCached } from '@/features/ai/ai-paths/lib/settings-store-client';
import type {
  AiNode,
  PathConfig,
  PathMeta,
} from '@/shared/contracts/ai-paths';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import type { QueryClient } from '@tanstack/react-query';

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const USER_PREFERENCES_STALE_MS = 5 * 60_000;

const resolvePreferredActivePathId = (
  data: { aiPathsActivePathId?: unknown } | null | undefined
): string | null =>
  typeof data?.aiPathsActivePathId === 'string' &&
  data.aiPathsActivePathId.trim().length > 0
    ? data.aiPathsActivePathId.trim()
    : null;

export type PathSettingsResult = {
  configs: Record<string, PathConfig>;
  orderedConfigs: PathConfig[];
  pathOrder: string[];
  uiState: Record<string, unknown> | null;
  preferredActivePathId: string | null;
};

export async function fetchPathSettings(
  queryClient: QueryClient,
): Promise<PathSettingsResult> {
  let settingsData: Array<{ key: string; value: string }> = [];
  try {
    settingsData = await queryClient.fetchQuery({
      queryKey: QUERY_KEYS.ai.aiPaths.settings(),
      queryFn: async () => {
        return await fetchAiPathsSettingsCached();
      },
      staleTime: AI_PATHS_SETTINGS_STALE_MS,
    });
  } catch {
    settingsData = await fetchAiPathsSettingsCached();
  }

  const map = new Map<string, string>(
    settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
  );

  let preferredActivePathId: string | null = null;
  const cachedPreferences = queryClient.getQueryData<{ aiPathsActivePathId?: unknown }>(
    QUERY_KEYS.userPreferences.all
  );
  try {
    preferredActivePathId = resolvePreferredActivePathId(cachedPreferences);
    if (!cachedPreferences) {
      const preferencesResponse = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.userPreferences.all,
        queryFn: async (): Promise<{ aiPathsActivePathId?: unknown }> => {
          return await api.get<{ aiPathsActivePathId?: unknown }>('/api/user/preferences', {
            logError: false,
          });
        },
        staleTime: USER_PREFERENCES_STALE_MS,
      });
      preferredActivePathId = resolvePreferredActivePathId(preferencesResponse);
    }
  } catch {
    preferredActivePathId = null;
  }

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
          .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);
        parsedIndex.forEach((meta: PathMeta) => {
          if (!meta?.id) return;
          const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
          if (!configRaw) {
            configs[meta.id] = createDefaultPathConfig(meta.id);
            return;
          }
          try {
            const parsedConfig = JSON.parse(configRaw) as PathConfig;
            configs[meta.id] = {
              ...createDefaultPathConfig(meta.id),
              ...parsedConfig,
              id: meta.id,
              name: parsedConfig?.name || meta.name || `Path ${meta.id}`,
            };
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

  return {
    configs,
    orderedConfigs,
    pathOrder: settingsPathOrder,
    uiState,
    preferredActivePathId,
  };
}

export function findTriggerPath(
  orderedConfigs: PathConfig[],
  uiState: Record<string, unknown> | null,
  preferredActivePathId: string | null,
  triggerEvent: string,
): PathConfig | undefined {
  const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
    Array.isArray(config?.nodes)
      ? config.nodes.some(
        (node: AiNode) =>
          node.type === 'trigger' &&
            (node.config?.trigger?.event ?? triggerEvent) === triggerEvent
      )
      : false
  );

  const activePathId =
    (typeof preferredActivePathId === 'string' && preferredActivePathId.trim().length > 0
      ? preferredActivePathId.trim()
      : null) ??
    (typeof uiState?.['activePathId'] === 'string' && uiState['activePathId'].trim().length > 0
      ? uiState['activePathId'].trim()
      : null);

  const activeTriggerCandidate = activePathId
    ? triggerCandidates.find((config: PathConfig): boolean => config.id === activePathId)
    : undefined;

  return activeTriggerCandidate ?? triggerCandidates[0] ?? orderedConfigs[0];
}
