'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  AI_PATHS_HISTORY_RETENTION_DEFAULT,
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_HISTORY_RETENTION_MAX,
  AI_PATHS_HISTORY_RETENTION_MIN,
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';
import { runsApi } from '@/shared/lib/ai-paths/api/client';
import { palette } from '@/shared/lib/ai-paths/core/definitions';
import {
  migrateTriggerToFetcherGraph,
  normalizeNodes,
} from '@/shared/lib/ai-paths/core/normalization';
import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { sanitizeEdges } from '@/shared/lib/ai-paths/core/utils/graph';
import { repairPathNodeIdentities } from '@/shared/lib/ai-paths/core/utils/node-identity';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine/defaults';
import {
  fetchAiPathsSettingsCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { AiNode, Edge, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import { api } from '@/shared/lib/api-client';
import {
  invalidateAiPathQueue,
  invalidateAiPathSettings,
  invalidateNotes,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
  invalidateProductsCountsAndDetail,
  invalidateProductsAndCounts,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

type TriggerEventEntityType = 'product' | 'note' | 'custom';

const AI_PATHS_SETTINGS_STALE_MS = 10_000;
const USER_PREFERENCES_STALE_MS = 5 * 60_000;

const normalizeLoadedPathName = (_pathId: string, name: unknown): string => {
  return typeof name === 'string' ? name.trim() : '';
};

const normalizeLoadedPathMetas = (metas: PathMeta[]): PathMeta[] => {
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

const normalizeHistoryRetentionPasses = (value: unknown): number => {
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

const resolveHistoryRetentionPasses = (
  settingsData: Array<{ key: string; value: string }>
): number => {
  const raw = settingsData.find(
    (item: { key: string; value: string }) => item.key === AI_PATHS_HISTORY_RETENTION_KEY
  )?.value;
  return normalizeHistoryRetentionPasses(raw);
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

export type FireAiPathTriggerEventArgs = {
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  preferredPathId?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  getEntityJson?: (() => Record<string, unknown> | null) | undefined;
  event?: React.MouseEvent<HTMLButtonElement> | React.MouseEvent | undefined;
  source?:
    | { tab?: string | undefined; location?: string | undefined; page?: string | undefined }
    | null
    | undefined;
  extras?: Record<string, unknown> | null | undefined;
  onProgress?:
    | ((payload: {
        status: 'running' | 'success' | 'error';
        progress: number;
        completedNodes: number;
        totalNodes: number;
        node?: { id: string; title?: string | null; type?: string | null } | null | undefined;
      }) => void)
    | undefined;
};

const loadPathConfigsFromSettings = async (
  settingsData?: Array<{ key: string; value: string }>
): Promise<{
  configs: Record<string, PathConfig>;
  settingsPathOrder: string[];
}> => {
  const configs: Record<string, PathConfig> = {};
  let settingsPathOrder: string[] = [];
  try {
    const data =
      settingsData ??
      (await (async (): Promise<Array<{ key: string; value: string }> | null> => {
        return await fetchAiPathsSettingsCached();
      })()) ??
      [];
    if (!data.length) return { configs: {}, settingsPathOrder: [] };
    const map = new Map<string, string>(
      data.map((item: { key: string; value: string }) => [item.key, item.value])
    );
    const indexRaw = map.get(PATH_INDEX_KEY);
    if (indexRaw) {
      try {
        const parsedIndex = JSON.parse(indexRaw) as unknown;
        if (Array.isArray(parsedIndex)) {
          const normalizedMetas = normalizeLoadedPathMetas(
            parsedIndex.filter(
              (meta: unknown): meta is PathMeta => Boolean(meta) && typeof meta === 'object'
            )
          );
          settingsPathOrder = normalizedMetas
            .map((meta: PathMeta) => meta?.id)
            .filter(
              (id: string | undefined): id is string => typeof id === 'string' && id.length > 0
            );
          normalizedMetas.forEach((meta: PathMeta) => {
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
                name:
                  normalizeLoadedPathName(meta.id, parsedConfig?.name) ||
                  normalizeLoadedPathName(meta.id, meta.name) ||
                  `Path ${meta.id}`,
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
    }
  } catch {
    return { configs: {}, settingsPathOrder: [] };
  }
  return { configs, settingsPathOrder };
};

type TriggerSelectionCandidate = Pick<PathConfig, 'id' | 'isActive'>;

export const selectTriggerCandidates = <T extends TriggerSelectionCandidate>(args: {
  triggerCandidates: T[];
  preferredPathId: string | null;
  activePathId: string | null;
}): {
  activeTriggerCandidates: T[];
  selectedConfig: T | null;
} => {
  const { triggerCandidates, preferredPathId, activePathId } = args;
  const activeTriggerCandidates: T[] = triggerCandidates.filter(
    (config: T): boolean => config.isActive !== false
  );

  const preferredByButton = preferredPathId
    ? (triggerCandidates.find((config: T): boolean => config.id === preferredPathId) ?? null)
    : null;

  if (preferredPathId) {
    return {
      activeTriggerCandidates,
      selectedConfig: preferredByButton,
    };
  }

  const preferredByActivePath = activePathId
    ? (activeTriggerCandidates.find((config: T): boolean => config.id === activePathId) ?? null)
    : null;

  if (activeTriggerCandidates.length > 1 && !preferredByActivePath) {
    return {
      activeTriggerCandidates,
      selectedConfig: null,
    };
  }

  return {
    activeTriggerCandidates,
    selectedConfig:
      preferredByActivePath ?? activeTriggerCandidates[0] ?? triggerCandidates[0] ?? null,
  };
};

const resolveTriggerSelection = async (
  settingsData: Array<{ key: string; value: string }>,
  triggerEventId: string,
  options?: {
    preferredPathId?: string | null | undefined;
    preferredActivePathId?: string | null | undefined;
  }
): Promise<{
  triggerCandidates: PathConfig[];
  activeTriggerCandidates: PathConfig[];
  selectedConfig: PathConfig | null;
  uiState: Record<string, unknown> | null;
}> => {
  const { configs, settingsPathOrder } = await loadPathConfigsFromSettings(settingsData);
  const configsList: PathConfig[] = Object.values(configs);
  const pathOrder: string[] = settingsPathOrder;
  const map = new Map<string, string>(
    settingsData.map((item: { key: string; value: string }) => [item.key, item.value])
  );
  const uiStateRaw = map.get(AI_PATHS_UI_STATE_KEY);
  const uiStateParsed = uiStateRaw ? safeParseJson(uiStateRaw).value : null;
  const uiState =
    uiStateParsed && typeof uiStateParsed === 'object'
      ? (uiStateParsed as Record<string, unknown>)
      : null;

  const orderedConfigs: PathConfig[] = pathOrder.length
    ? pathOrder
      .map((id: string) => configs[id])
      .filter((config: PathConfig | undefined): config is PathConfig => Boolean(config))
    : configsList;

  const fallbackTriggerEventId = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';
  const triggerCandidates: PathConfig[] = orderedConfigs.filter((config: PathConfig) =>
    Array.isArray(config?.nodes)
      ? config.nodes.some((node: AiNode) => {
        if (node.type !== 'trigger') return false;
        const configuredEvent = node.config?.trigger?.event ?? fallbackTriggerEventId;
        return configuredEvent === triggerEventId;
      })
      : false
  );

  const preferredPathId =
    typeof options?.preferredPathId === 'string' && options.preferredPathId.trim().length > 0
      ? options.preferredPathId.trim()
      : null;
  const activePathId =
    (typeof options?.preferredActivePathId === 'string' &&
    options.preferredActivePathId.trim().length > 0
      ? options.preferredActivePathId.trim()
      : null) ??
    (typeof uiState?.['activePathId'] === 'string' && uiState['activePathId'].trim().length > 0
      ? uiState['activePathId'].trim()
      : null);

  const selection = selectTriggerCandidates<PathConfig>({
    triggerCandidates,
    preferredPathId,
    activePathId,
  });

  return {
    triggerCandidates,
    activeTriggerCandidates: selection.activeTriggerCandidates,
    selectedConfig: selection.selectedConfig,
    uiState,
  };
};

const buildTriggerContext = (args: {
  triggerNode: AiNode;
  triggerEventId: string;
  triggerLabel?: string | null | undefined;
  entityType: TriggerEventEntityType;
  entityId?: string | null | undefined;
  entityJson?: Record<string, unknown> | null;
  event?: React.MouseEvent;
  pathInfo?: { id?: string | undefined; name?: string | undefined } | null | undefined;
  source?:
    | { tab?: string | undefined; location?: string | undefined; page?: string | undefined }
    | null
    | undefined;
  extras?: Record<string, unknown> | null | undefined;
}): Record<string, unknown> => {
  const timestamp = new Date().toISOString();
  const nativeEvent = args.event?.nativeEvent;
  const pointer = nativeEvent
    ? {
      clientX: nativeEvent.clientX,
      clientY: nativeEvent.clientY,
      pageX: nativeEvent.pageX,
      pageY: nativeEvent.pageY,
      screenX: nativeEvent.screenX,
      screenY: nativeEvent.screenY,
      offsetX: nativeEvent.offsetX,
      offsetY: nativeEvent.offsetY,
      button: nativeEvent.button,
      buttons: nativeEvent.buttons,
      altKey: nativeEvent.altKey,
      ctrlKey: nativeEvent.ctrlKey,
      shiftKey: nativeEvent.shiftKey,
      metaKey: nativeEvent.metaKey,
    }
    : undefined;

  const location =
    typeof window !== 'undefined'
      ? {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        referrer: document.referrer || undefined,
      }
      : {};

  const ui =
    typeof window !== 'undefined'
      ? {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          devicePixelRatio: window.devicePixelRatio,
        },
        screen: {
          width: window.screen?.width,
          height: window.screen?.height,
          availWidth: window.screen?.availWidth,
          availHeight: window.screen?.availHeight,
        },
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        languages: navigator.languages,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        documentTitle: document.title,
        visibilityState: document.visibilityState,
        scroll: {
          x: window.scrollX,
          y: window.scrollY,
        },
      }
      : {};

  const base: Record<string, unknown> = {
    timestamp,
    location,
    ui,
    user: null,
    event: {
      id: args.triggerEventId,
      nodeId: args.triggerNode.id,
      nodeTitle: args.triggerNode.title,
      type: args.event?.type,
      pointer,
    },
    source: {
      pathId: args.pathInfo?.id,
      pathName: args.pathInfo?.name ?? 'AI Trigger Button',
      tab: args.source?.tab ?? args.entityType,
      location: args.source?.location ?? null,
      page: args.source?.page ?? null,
    },
    extras: {
      triggerLabel: args.triggerLabel ?? null,
      ...(args.extras ?? {}),
    },
    entityId: args.entityId ?? null,
    entityType: args.entityType,
    ...(args.entityType === 'product' && args.entityId ? { productId: args.entityId } : {}),
  };

  if (args.entityJson) {
    base['entityJson'] = args.entityJson;
    base['entity'] = args.entityJson;
    if (args.entityType === 'product') base['product'] = args.entityJson;
  }

  return base;
};

export function useAiPathTriggerEvent(): {
  fireAiPathTriggerEvent: (args: FireAiPathTriggerEventArgs) => Promise<void>;
  } {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resolvePreferredActivePathId = async (): Promise<string | null> => {
    const cachedPreferences = queryClient.getQueryData<{ aiPathsActivePathId?: unknown }>(
      QUERY_KEYS.userPreferences.all
    );
    const cachedPathId =
      typeof cachedPreferences?.aiPathsActivePathId === 'string' &&
      cachedPreferences.aiPathsActivePathId.trim().length > 0
        ? cachedPreferences.aiPathsActivePathId.trim()
        : null;
    if (cachedPathId) {
      return cachedPathId;
    }
    try {
      const data = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.userPreferences.all,
        queryFn: async (): Promise<{ aiPathsActivePathId?: unknown }> => {
          return await api.get<{ aiPathsActivePathId?: unknown }>('/api/user/preferences', {
            logError: false,
          });
        },
        staleTime: USER_PREFERENCES_STALE_MS,
      });
      return typeof data.aiPathsActivePathId === 'string' &&
        data.aiPathsActivePathId.trim().length > 0
        ? data.aiPathsActivePathId.trim()
        : null;
    } catch {
      return null;
    }
  };

  const fireAiPathTriggerEvent = useCallback(async (args: FireAiPathTriggerEventArgs): Promise<void> => {
    const triggerEventId = args.triggerEventId.trim();
    if (!triggerEventId) {
      toast('Missing trigger id.', { variant: 'error' });
      return;
    }

    try {
      toast(`Preparing AI Path run: ${args.triggerLabel?.trim() || triggerEventId}`, {
        variant: 'info',
      });
      args.onProgress?.({
        status: 'running',
        progress: 0,
        completedNodes: 0,
        totalNodes: 1,
        node: null,
      });

      let settingsData: Array<{ key: string; value: string }> = [];
      const [preferredActivePathId, fetchedSettingsData] = await Promise.all([
        resolvePreferredActivePathId(),
        queryClient
          .fetchQuery({
            queryKey: QUERY_KEYS.ai.aiPaths.settings(),
            queryFn: async () => {
              return await fetchAiPathsSettingsCached();
            },
            staleTime: AI_PATHS_SETTINGS_STALE_MS,
          })
          .catch(async () => {
            try {
              return await fetchAiPathsSettingsCached();
            } catch {
              return [] as Array<{ key: string; value: string }>;
            }
          }),
      ]);
      settingsData = fetchedSettingsData;
      let historyRetentionPasses = resolveHistoryRetentionPasses(settingsData);

      let selection = await resolveTriggerSelection(settingsData, triggerEventId, {
        preferredPathId: args.preferredPathId ?? null,
        preferredActivePathId,
      });
      const triggerCandidates: PathConfig[] = selection.triggerCandidates;
      const activeTriggerCandidates: PathConfig[] = selection.activeTriggerCandidates;

      if (triggerCandidates.length === 0) {
        toast(
          `No AI Path found for trigger "${args.triggerLabel ?? triggerEventId}". Add a Trigger node with event "${triggerEventId}".`,
          { variant: 'error' }
        );
        return;
      }

      let selectedConfig = selection.selectedConfig;
      let uiState = selection.uiState;
      if (!selectedConfig) {
        if (args.preferredPathId) {
          toast(
            `No matching AI Path found for trigger "${args.triggerLabel ?? triggerEventId}" and bound path "${args.preferredPathId}".`,
            { variant: 'error' }
          );
          return;
        }
        if (activeTriggerCandidates.length > 1) {
          toast(
            `Trigger "${args.triggerLabel ?? triggerEventId}" matches multiple AI Paths. Set an active path in AI Paths settings or bind this trigger button to a specific path.`,
            { variant: 'error' }
          );
          return;
        }
        toast(
          `No AI Path found for trigger "${args.triggerLabel ?? triggerEventId}". Add a Trigger node with event "${triggerEventId}".`,
          { variant: 'error' }
        );
        return;
      }

      if (selectedConfig.isActive === false) {
        // Guard against stale settings cache after path activation toggles.
        invalidateAiPathsSettingsCache();
        const freshSettingsData = await fetchAiPathsSettingsCached({
          bypassCache: true,
        });
        selection = await resolveTriggerSelection(freshSettingsData, triggerEventId, {
          preferredPathId: args.preferredPathId ?? null,
          preferredActivePathId,
        });
        if (selection.selectedConfig?.isActive === false || !selection.selectedConfig) {
          toast('This path is deactivated. Activate it to run.', { variant: 'info' });
          return;
        }
        settingsData = freshSettingsData;
        historyRetentionPasses = resolveHistoryRetentionPasses(settingsData);
        selectedConfig = selection.selectedConfig;
        uiState = selection.uiState;
      }

      const nodes: AiNode[] = normalizeNodes(selectedConfig.nodes ?? []);
      const edges: Edge[] = sanitizeEdges(
        nodes,
        Array.isArray(selectedConfig.edges) ? selectedConfig.edges : []
      );
      const fallbackTriggerEventId = (TRIGGER_EVENTS[0]?.id as string) ?? 'manual';

      const triggerNodes: AiNode[] = nodes.filter((node: AiNode) => {
        if (node.type !== 'trigger') return false;
        const configuredEvent = node.config?.trigger?.event ?? fallbackTriggerEventId;
        return configuredEvent === triggerEventId;
      });

      const triggerNode: AiNode | undefined =
        triggerNodes.find((node: AiNode) => edges.some((edge: Edge) => edge.from === node.id)) ??
        triggerNodes.find((node: AiNode) =>
          edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
        ) ??
        triggerNodes[0];

      if (!triggerNode) {
        toast('No trigger node found for this event.', { variant: 'error' });
        return;
      }

      const adjacency = new Map<string, Set<string>>();
      edges.forEach((edge: Edge) => {
        if (!edge.from || !edge.to) return;
        const fromSet = adjacency.get(edge.from) ?? new Set<string>();
        fromSet.add(edge.to);
        adjacency.set(edge.from, fromSet);
      });

      const connected = new Set<string>();
      const queue: string[] = [triggerNode.id];
      connected.add(triggerNode.id);
      while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const neighbors = adjacency.get(current);
        if (!neighbors) continue;
        neighbors.forEach((neighbor: string) => {
          if (connected.has(neighbor)) return;
          connected.add(neighbor);
          queue.push(neighbor);
        });
      }

      const connectedFetcherRequiresLiveEntityContext = nodes.some((node: AiNode): boolean => {
        if (node.type !== 'fetcher' || !connected.has(node.id)) return false;
        const sourceMode = node.config?.fetcher?.sourceMode ?? 'live_context';
        return sourceMode === 'live_context';
      });
      const normalizedEntityId =
        typeof args.entityId === 'string' && args.entityId.trim().length > 0
          ? args.entityId.trim()
          : null;
      if (
        connectedFetcherRequiresLiveEntityContext &&
        !normalizedEntityId &&
        args.entityType !== 'custom'
      ) {
        toast(
          'Selected AI Path expects live entity context, but no entity id was provided. Run from a row/modal item or bind this trigger to a path with simulation context.',
          { variant: 'error' }
        );
        return;
      }

      const totalNodes = Math.max(
        1,
        nodes.filter((node: AiNode): boolean => {
          if (node.type === 'simulation') return false;
          return connected.has(node.id);
        }).length
      );
      const completed = new Set<string>();
      const reportProgress = (payload: {
        status: 'running' | 'success' | 'error';
        progress: number;
        node?: AiNode | null | undefined;
      }): void => {
        if (!args.onProgress) return;
        const rawProgress = Number.isFinite(payload.progress) ? payload.progress : 0;
        const clamped = Math.max(0, Math.min(1, rawProgress));
        const node = payload.node
          ? {
            id: payload.node.id,
            title: payload.node.title ?? null,
            type: payload.node.type ?? null,
          }
          : null;
        args.onProgress({
          status: payload.status,
          progress: clamped,
          completedNodes: completed.size,
          totalNodes,
          node,
        });
      };

      let entityJson: Record<string, unknown> | null = null;
      if (args.getEntityJson) {
        try {
          entityJson = args.getEntityJson();
        } catch (entityJsonError) {
          logClientError(entityJsonError, {
            context: { source: 'useAiPathTriggerEvent', action: 'getEntityJson' },
          });
          // Proceed without entity JSON rather than failing the whole trigger
        }
      }

      const triggerContext = buildTriggerContext({
        triggerNode,
        triggerEventId,
        triggerLabel: args.triggerLabel ?? null,
        entityType: args.entityType,
        entityId: args.entityId ?? null,
        entityJson,
        ...(args.event ? { event: args.event as React.MouseEvent } : {}),
        pathInfo: { id: selectedConfig.id, name: selectedConfig.name },
        source: args.source ?? null,
        extras: args.extras ?? null,
      });

      reportProgress({ status: 'running', progress: 0 });

      const validationConfig = normalizeAiPathsValidationConfig(selectedConfig.aiPathsValidation);
      const runPreflight = evaluateRunPreflight({
        nodes,
        edges,
        aiPathsValidation: validationConfig,
        strictFlowMode: selectedConfig.strictFlowMode !== false,
        triggerNodeId: triggerNode.id,
        mode: 'full',
      });
      if (runPreflight.shouldBlock) {
        reportProgress({ status: 'error', progress: 0 });
        toast(runPreflight.blockMessage ?? 'Run blocked by preflight validation.', {
          variant: 'error',
        });
        return;
      }
      if (runPreflight.warnings.length > 0) {
        toast(runPreflight.warnings[0]?.message ?? 'Preflight warning.', {
          variant: 'warning',
        });
      }

      const persistRunSnapshot = async (runAt: string): Promise<void> => {
        try {
          const nextUiState = {
            ...(uiState && typeof uiState === 'object' ? uiState : {}),
            lastTriggeredAt: runAt,
          };
          await updateAiPathsSetting(AI_PATHS_UI_STATE_KEY, JSON.stringify(nextUiState));
          invalidateAiPathsSettingsCache();
          void invalidateAiPathSettings(queryClient);
        } catch (error) {
          logClientError(error, {
            context: { source: 'useAiPathTriggerEvent', action: 'persistRunSnapshot' },
          });
        }
      };

      const executionMode = selectedConfig.executionMode ?? 'server';
      const invalidateProductQueries = (productId?: string | null): void => {
        if (productId) {
          void invalidateProductsCountsAndDetail(queryClient, productId);
        } else {
          void invalidateProductsAndCounts(queryClient);
        }
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.jobs.productAi('all') });
      };
      const scheduleQueuedProductRefresh = (productId?: string | null): void => {
        invalidateProductQueries(productId);
        const refreshDelaysMs = [1500, 4000, 9000];
        for (const delayMs of refreshDelaysMs) {
          setTimeout(() => {
            invalidateProductQueries(productId);
          }, delayMs);
        }
      };

      if (executionMode === 'local') {
        toast(
          'Path Execution is Local, but local browser execution is unavailable in this view. Queuing a server run instead.',
          { variant: 'info' }
        );
      }

      const enqueueResult = await runsApi.enqueue({
        pathId: selectedConfig.id ?? 'path',
        pathName: selectedConfig.name ?? undefined,
        nodes,
        edges,
        triggerEvent: triggerEventId,
        triggerNodeId: triggerNode.id,
        triggerContext,
        entityId: args.entityId ?? null,
        entityType: args.entityType,
        meta: {
          source: 'trigger_button',
          triggerEventId,
          triggerLabel: args.triggerLabel ?? null,
          historyRetentionPasses,
          strictFlowMode: selectedConfig.strictFlowMode !== false,
          blockedRunPolicy:
            selectedConfig.blockedRunPolicy === 'complete_with_warning'
              ? 'complete_with_warning'
              : 'fail_run',
          aiPathsValidation: validationConfig,
          validationPreflight: runPreflight.validationReport,
          runPreflight: {
            compile: {
              errors: runPreflight.compileReport.errors,
              warnings: runPreflight.compileReport.warnings,
              findings: runPreflight.compileReport.findings,
            },
            dependency: runPreflight.dependencyReport
              ? {
                errors: runPreflight.dependencyReport.errors,
                warnings: runPreflight.dependencyReport.warnings,
                strictReady: runPreflight.dependencyReport.strictReady,
              }
              : null,
            dataContract: {
              errors: runPreflight.dataContractReport.errors,
              warnings: runPreflight.dataContractReport.warnings,
              issues: runPreflight.dataContractReport.issues.slice(0, 12),
            },
          },
          ...(args.source ? { sourceInfo: args.source } : {}),
          ...(args.extras ?? {}),
        },
      });

      if (!enqueueResult.ok) {
        reportProgress({ status: 'error', progress: 0 });
        const errorMsg = enqueueResult.error || 'Failed to enqueue AI Path run.';
        const isBrainError =
          typeof errorMsg === 'string' &&
          (errorMsg.includes('Brain settings') ||
            errorMsg.includes('AI Paths execution is disabled'));
        toast(
          isBrainError ? `${errorMsg} Go to /admin/brain to configure.` : errorMsg,
          { variant: 'error', duration: isBrainError ? 10_000 : undefined }
        );
        return;
      }

      const runAt = new Date().toISOString();
      reportProgress({ status: 'success', progress: 1 });
      const queuedRun =
        enqueueResult.data && typeof enqueueResult.data === 'object'
          ? (enqueueResult.data as { run?: unknown }).run
          : null;
      optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRun);
      void invalidateAiPathQueue(queryClient);
      notifyAiPathRunEnqueued(
        queuedRun &&
          typeof queuedRun === 'object' &&
          typeof (queuedRun as { id?: unknown }).id === 'string'
          ? (queuedRun as { id: string }).id
          : null
      );
      toast('AI Path run queued. Track progress at /admin/ai-paths/queue', { variant: 'success' });

      if (args.entityType === 'product') {
        scheduleQueuedProductRefresh(args.entityId);
      }
      if (args.entityType === 'note') {
        void invalidateNotes(queryClient);
      }

      void persistRunSnapshot(runAt);
    } catch (error) {
      logClientError(error, {
        context: { source: 'useAiPathTriggerEvent', action: 'fireAiPathTriggerEvent' },
      });
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : 'Failed to run AI Path trigger.';
      toast(errorMessage, { variant: 'error' });
    }
  }, [queryClient, toast]);

  return { fireAiPathTriggerEvent };
}
