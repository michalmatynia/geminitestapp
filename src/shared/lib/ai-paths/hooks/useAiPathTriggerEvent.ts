'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  AI_PATHS_HISTORY_RETENTION_KEY,
  AI_PATHS_UI_STATE_KEY,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  TRIGGER_EVENTS,
} from '@/shared/lib/ai-paths/core/constants';
import {
  enqueueAiPathRun,
  listAiPathRuns,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths/api/client';
import {
  normalizeLoadedPathName,
  normalizeLoadedPathMetas,
  resolveHistoryRetentionPasses,
  sanitizeTriggerPathConfig,
} from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine/defaults';
import {
  fetchAiPathsSettingsCached,
  fetchAiPathsSettingsByKeysCached,
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { AiNode, PathConfig, PathMeta } from '@/shared/contracts/ai-paths';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/contracts/ai-paths-core/nodes';
import { validationError } from '@/shared/errors/app-error';
import {
  invalidateAiPathQueue,
  invalidateAiPathSettings,
  invalidateNotes,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
  invalidateProductsCountsAndDetail,
  invalidateProductsAndCounts,
  invalidateIntegrationJobs,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  type FireAiPathTriggerEventArgs,
  type TriggerEventEntityType,
} from '@/shared/contracts/ai-trigger-buttons';
import { useToast } from '@/shared/ui';

const TRIGGER_SETTINGS_PRELOAD_TIMEOUT_MS = 8_000;

const isTimeoutMessage = (message: string | null | undefined): boolean => {
  if (!message || typeof message !== 'string') return false;
  const normalized = message.toLowerCase();
  return normalized.includes('timed out') || normalized.includes('timeout');
};

const resolvePreferredPathId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildSelectiveTriggerSettingsData = async (
  preferredPathId: string
): Promise<Array<{ key: string; value: string }>> => {
  const preferredConfigKey = `${PATH_CONFIG_PREFIX}${preferredPathId}`;
  const selectiveRecords = await fetchAiPathsSettingsByKeysCached(
    [AI_PATHS_HISTORY_RETENTION_KEY, AI_PATHS_UI_STATE_KEY, preferredConfigKey],
    { timeoutMs: TRIGGER_SETTINGS_PRELOAD_TIMEOUT_MS }
  );
  const configRecord =
    selectiveRecords.find((item: { key: string }) => item.key === preferredConfigKey) ?? null;
  if (!configRecord || typeof configRecord.value !== 'string' || configRecord.value.length === 0) {
    throw new Error(`Missing preferred path config for ${preferredPathId}.`);
  }

  let preferredPathName = `Path ${preferredPathId.slice(0, 6)}`;
  try {
    const parsed = JSON.parse(configRecord.value) as { name?: unknown };
    if (typeof parsed?.name === 'string' && parsed.name.trim().length > 0) {
      preferredPathName = parsed.name.trim();
    }
  } catch {
    // Keep fallback name when config is malformed.
  }

  const timestamp = new Date().toISOString();
  const syntheticIndex = JSON.stringify([
    {
      id: preferredPathId,
      name: preferredPathName,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ]);
  const baseRecords = selectiveRecords.filter(
    (item: { key: string }) => item.key !== PATH_INDEX_KEY && item.key !== preferredConfigKey
  );
  return [
    ...baseRecords,
    { key: PATH_INDEX_KEY, value: syntheticIndex },
    { key: preferredConfigKey, value: configRecord.value },
  ];
};

const loadTriggerSettingsData = async (args: {
  preferredPathId?: string | null | undefined;
}): Promise<{
  mode: 'selective' | 'full';
  settingsData: Array<{ key: string; value: string }>;
}> => {
  const preferredPathId = resolvePreferredPathId(args.preferredPathId ?? null);
  if (!preferredPathId) {
    return {
      mode: 'full',
      settingsData: await fetchAiPathsSettingsCached(),
    };
  }

  try {
    return {
      mode: 'selective',
      settingsData: await buildSelectiveTriggerSettingsData(preferredPathId),
    };
  } catch (error) {
    logClientError(error, {
      context: {
        source: 'useAiPathTriggerEvent',
        action: 'selectiveSettingsFallback',
        preferredPathId,
      },
    });
    return {
      mode: 'full',
      settingsData: await fetchAiPathsSettingsCached(),
    };
  }
};

const sanitizeLoadedPathConfig = (config: PathConfig): PathConfig =>
  sanitizeTriggerPathConfig(config);

export { sanitizeTriggerPathConfig };

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const resolveRuntimeStateHint = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'string') {
    const parsed = safeParseJson<Record<string, unknown>>(value);
    if (parsed.error) return null;
    return toRecord(parsed.value);
  }
  return toRecord(value);
};

const coerceSampleStateMap = <T>(value: unknown): Record<string, T> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, T>;
};

const loadPathConfigsFromSettings = async (
  settingsData?: Array<{ key: string; value: string }>
): Promise<{
  configs: Record<string, PathConfig>;
  settingsPathOrder: string[];
}> => {
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
  if (!indexRaw?.trim()) {
    return { configs: {}, settingsPathOrder: [] };
  }

  let parsedIndex: unknown;
  try {
    parsedIndex = JSON.parse(indexRaw) as unknown;
  } catch (error) {
    throw validationError('Invalid AI Paths index payload.', {
      source: 'ai_paths.trigger_payload',
      reason: 'index_invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }
  if (!Array.isArray(parsedIndex)) {
    throw validationError('Invalid AI Paths index payload.', {
      source: 'ai_paths.trigger_payload',
      reason: 'index_not_array',
    });
  }

  const metas = parsedIndex.map((meta: unknown, index: number): PathMeta => {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
      throw validationError('Invalid AI Paths index entry.', {
        source: 'ai_paths.trigger_payload',
        reason: 'index_entry_not_object',
        index,
      });
    }
    return meta as PathMeta;
  });
  const normalizedMetas = normalizeLoadedPathMetas(metas);
  const settingsPathOrder = normalizedMetas
    .map((meta: PathMeta) => meta?.id)
    .filter((id: string | undefined): id is string => typeof id === 'string' && id.length > 0);
  const configs: Record<string, PathConfig> = {};

  normalizedMetas.forEach((meta: PathMeta): void => {
    if (!meta?.id) return;
    const configRaw = map.get(`${PATH_CONFIG_PREFIX}${meta.id}`);
    if (!configRaw?.trim()) {
      throw validationError('AI Paths index references missing config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'missing_path_config',
        pathId: meta.id,
      });
    }

    let parsedConfig: unknown;
    try {
      parsedConfig = JSON.parse(configRaw) as unknown;
    } catch (error) {
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_invalid_json',
        pathId: meta.id,
        cause: error instanceof Error ? error.message : 'unknown_error',
      });
    }
    if (!parsedConfig || typeof parsedConfig !== 'object' || Array.isArray(parsedConfig)) {
      throw validationError('Invalid AI Path config payload.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_not_object',
        pathId: meta.id,
      });
    }

    const config = parsedConfig as PathConfig;
    const normalizedConfig = sanitizeLoadedPathConfig(config);
    const normalizedId = typeof normalizedConfig.id === 'string' ? normalizedConfig.id.trim() : '';
    if (!normalizedId || normalizedId !== meta.id) {
      throw validationError('AI Path config id does not match index entry.', {
        source: 'ai_paths.trigger_payload',
        reason: 'config_id_mismatch',
        expectedPathId: meta.id,
        actualPathId: normalizedId || null,
      });
    }
    const normalizedName =
      normalizeLoadedPathName(meta.id, normalizedConfig.name) ||
      normalizeLoadedPathName(meta.id, meta.name);
    if (!normalizedName) {
      throw validationError('AI Path config name is required.', {
        source: 'ai_paths.trigger_payload',
        reason: 'missing_path_name',
        pathId: meta.id,
      });
    }

    configs[meta.id] = {
      ...normalizedConfig,
      id: meta.id,
      name: normalizedName,
    };
  });

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
  const uiStateEnvelope = uiStateRaw ? safeParseJson<{ value?: unknown }>(uiStateRaw).value : null;
  const uiStateParsed =
    uiStateEnvelope && typeof uiStateEnvelope === 'object' ? uiStateEnvelope['value'] : null;
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

  const resolvePreferredActivePathId = useCallback((): string | null => {
    const cachedPreferences = queryClient.getQueryData<{ aiPathsActivePathId?: unknown }>(
      QUERY_KEYS.userPreferences.all
    );
    return resolvePreferredPathId(
      typeof cachedPreferences?.aiPathsActivePathId === 'string'
        ? cachedPreferences.aiPathsActivePathId
        : null
    );
  }, [queryClient]);

  const fireAiPathTriggerEvent = useCallback(
    async (args: FireAiPathTriggerEventArgs): Promise<void> => {
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

        const phaseStartedAt = performance.now();
        const preferredPathStartedAt = performance.now();
        const preferredActivePathId = resolvePreferredActivePathId();
        const resolvePreferredPathMs = performance.now() - preferredPathStartedAt;

        const settingsStartedAt = performance.now();
        let settingsData: Array<{ key: string; value: string }> = [];
        let settingsLoadMode: 'selective' | 'full' = 'full';
        try {
          const settingsLoad = await loadTriggerSettingsData({
            preferredPathId: args.preferredPathId ?? null,
          });
          settingsData = settingsLoad.settingsData;
          settingsLoadMode = settingsLoad.mode;
        } catch (settingsError) {
          const errorMessage =
            settingsError instanceof Error ? settingsError.message : String(settingsError);
          const timeoutCode = isTimeoutMessage(errorMessage) ? 'settings_preload_timeout' : null;
          logClientError(settingsError, {
            context: {
              source: 'useAiPathTriggerEvent',
              action: 'loadTriggerSettingsData',
              timeoutCode,
            },
          });
          toast(
            timeoutCode
              ? 'Failed to prepare AI Path run (settings_preload_timeout). Please retry.'
              : 'Failed to load AI Path settings. Please retry.',
            { variant: 'error' }
          );
          args.onProgress?.({
            status: 'error',
            error: timeoutCode || 'settings_load_error',
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }
        const settingsDurationMs = performance.now() - settingsStartedAt;

        const selectionStartedAt = performance.now();
        let triggerCandidates: PathConfig[] = [];
        let activeTriggerCandidates: PathConfig[] = [];
        let selectedConfig: PathConfig | null = null;
        let uiState: Record<string, unknown> | null = null;
        try {
          const selection = await resolveTriggerSelection(settingsData, triggerEventId, {
            preferredPathId: args.preferredPathId,
            preferredActivePathId,
          });
          triggerCandidates = selection.triggerCandidates;
          activeTriggerCandidates = selection.activeTriggerCandidates;
          selectedConfig = selection.selectedConfig;
          uiState = selection.uiState;
        } catch (selectionError) {
          const message =
            selectionError instanceof Error
              ? selectionError.message
              : 'AI Path trigger settings are invalid.';
          logClientError(selectionError, {
            context: {
              source: 'useAiPathTriggerEvent',
              action: 'resolveTriggerSelection',
              triggerEventId,
            },
          });
          toast(message, { variant: 'error' });
          args.onProgress?.({
            status: 'error',
            error: 'trigger_settings_invalid',
            message,
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }
        const selectionDurationMs = performance.now() - selectionStartedAt;

        if (!selectedConfig) {
          if (triggerCandidates.length === 0) {
            toast(`No AI Path configured for trigger: ${triggerEventId}`, { variant: 'warning' });
            args.onProgress?.({
              status: 'error',
              error: 'no_path_configured',
              progress: 0,
              completedNodes: 0,
              totalNodes: 1,
              node: null,
            });
            return;
          }
          if (activeTriggerCandidates.length === 0) {
            toast('All AI Paths for this trigger are disabled.', { variant: 'warning' });
            args.onProgress?.({
              status: 'error',
              error: 'path_disabled',
              progress: 0,
              completedNodes: 0,
              totalNodes: 1,
              node: null,
            });
            return;
          }
          toast('Multiple active paths for trigger. Please specify preferredPathId.', {
            variant: 'warning',
          });
          args.onProgress?.({
            status: 'error',
            error: 'ambiguous_path_selection',
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }

        let entityJson: Record<string, unknown> | null = null;
        if (typeof args.getEntityJson === 'function') {
          try {
            entityJson = args.getEntityJson();
          } catch (entityJsonError) {
            logClientError(entityJsonError, {
              context: {
                source: 'useAiPathTriggerEvent',
                action: 'getEntityJson',
                triggerEventId,
              },
            });
          }
        }

        const historyRetentionPasses = resolveHistoryRetentionPasses(settingsData);
        const triggerNode = selectedConfig.nodes.find((node: AiNode) => {
          if (node.type !== 'trigger') return false;
          const configuredEvent = node.config?.trigger?.event ?? 'manual';
          return configuredEvent === triggerEventId;
        });

        if (!triggerNode) {
          toast(`Trigger node not found in path: ${selectedConfig.name}`, { variant: 'error' });
          args.onProgress?.({
            status: 'error',
            error: 'trigger_node_not_found',
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }

        const preflightStartedAt = performance.now();
        const validationConfig = normalizeAiPathsValidationConfig(
          selectedConfig.aiPathsValidation ?? null
        );
        const runtimeStateHint = resolveRuntimeStateHint(selectedConfig.runtimeState);
        const parserSamples = coerceSampleStateMap<ParserSampleState>(selectedConfig.parserSamples);
        const updaterSamples = coerceSampleStateMap<UpdaterSampleState>(
          selectedConfig.updaterSamples
        );
        const preflight = evaluateRunPreflight({
          nodes: selectedConfig.nodes,
          edges: selectedConfig.edges,
          aiPathsValidation: validationConfig,
          strictFlowMode: selectedConfig.strictFlowMode ?? true,
          triggerNodeId: triggerNode.id,
          ...(parserSamples ? { parserSamples } : {}),
          ...(updaterSamples ? { updaterSamples } : {}),
          mode: 'full',
        });
        const preflightDurationMs = performance.now() - preflightStartedAt;

        if (preflight.shouldBlock) {
          const preflightMessage = preflight.blockMessage ?? 'Unknown preflight error.';
          toast(`Path validation failed: ${preflightMessage}`, { variant: 'error' });
          args.onProgress?.({
            status: 'error',
            error: 'preflight_failed',
            message: preflightMessage,
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }

        const contextStartedAt = performance.now();
        const triggerContext = buildTriggerContext({
          triggerNode,
          triggerEventId,
          triggerLabel: args.triggerLabel,
          entityType: args.entityType,
          entityId: args.entityId,
          entityJson,
          event: args.event,
          pathInfo: { id: selectedConfig.id, name: selectedConfig.name },
          source: args.source,
          extras: args.extras,
        });
        const contextDurationMs = performance.now() - contextStartedAt;

        const apiStartedAt = performance.now();
        const runResult = await enqueueAiPathRun({
          pathId: selectedConfig.id,
          pathName: selectedConfig.name,
          nodes: selectedConfig.nodes,
          edges: selectedConfig.edges,
          triggerEvent: triggerEventId,
          triggerNodeId: triggerNode.id,
          triggerContext,
          entityId: args.entityId,
          entityType: args.entityType,
          meta: {
            historyRetentionPasses,
            preflightRuntimeHints: {
              ...(selectedConfig.parserSamples
                ? { parserSamples: selectedConfig.parserSamples }
                : {}),
              ...(selectedConfig.updaterSamples
                ? { updaterSamples: selectedConfig.updaterSamples }
                : {}),
              ...(runtimeStateHint ? { runtimeState: runtimeStateHint } : {}),
            },
            clientMetadata: {
              source: 'useAiPathTriggerEvent',
              triggerEventId,
              triggerLabel: args.triggerLabel ?? null,
              entityType: args.entityType,
              entityId: args.entityId ?? null,
              preferredPathId: args.preferredPathId ?? null,
              settingsLoadMode,
              performance: {
                totalPrepMs: performance.now() - phaseStartedAt,
                resolvePreferredPathMs,
                settingsDurationMs,
                selectionDurationMs,
                preflightDurationMs,
                contextDurationMs,
              },
            },
          },
        });
        const apiDurationMs = performance.now() - apiStartedAt;

        if (!runResult.ok) {
          toast(`Failed to start AI Path: ${runResult.error || 'API Error'}`, { variant: 'error' });
          args.onProgress?.({
            status: 'error',
            error: 'api_error',
            message: runResult.error as string | undefined,
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }

        const { runId, runRecord } = resolveAiPathRunFromEnqueueResponseData(runResult.data);
        if (!runId) {
          toast('Failed to start AI Path: invalid run identifier from API.', { variant: 'error' });
          args.onProgress?.({
            status: 'error',
            error: 'api_error',
            message: 'Invalid run identifier returned by enqueue endpoint.',
            progress: 0,
            completedNodes: 0,
            totalNodes: 1,
            node: null,
          });
          return;
        }

        const totalPrepMs = performance.now() - phaseStartedAt;

        logClientError(new Error(`AI Path started: ${selectedConfig.name} (${runId})`), {
          context: {
            source: 'useAiPathTriggerEvent',
            action: 'fireSuccess',
            pathId: selectedConfig.id,
            runId,
            triggerEventId,
            totalPrepMs,
            performance: {
              resolvePreferredPathMs,
              settingsDurationMs,
              selectionDurationMs,
              preflightDurationMs,
              contextDurationMs,
              apiDurationMs,
            },
          },
        });

        const queuedRunForCache = runRecord ?? {
          id: runId,
          pathId: selectedConfig.id,
          pathName: selectedConfig.name,
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          progress: 0,
        };
        optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRunForCache);

        void invalidateAiPathQueue(queryClient);
        notifyAiPathRunEnqueued(runId, {
          entityId: args.entityId ?? null,
          entityType: args.entityType,
        });

        if (args.entityType === 'product') {
          if (args.entityId) {
            void invalidateProductsCountsAndDetail(queryClient, args.entityId);
          } else {
            void invalidateProductsAndCounts(queryClient);
          }
        }
        if (args.entityType === 'note') {
          void invalidateNotes(queryClient);
        }
        // @ts-ignore - integration is a valid entity type in the contract but TypeScript is being overly restrictive here.
        if (args.entityType === 'integration') {
          void invalidateIntegrationJobs(queryClient);
        }

        if (selectedConfig.id !== preferredActivePathId) {
          const nextUiState = {
            ...(uiState ?? {}),
            activePathId: selectedConfig.id,
          };
          await updateAiPathsSetting(AI_PATHS_UI_STATE_KEY, JSON.stringify({ value: nextUiState }));
          void invalidateAiPathSettings(queryClient);
          invalidateAiPathsSettingsCache();
        }

        args.onSuccess?.(runId);
        args.onProgress?.({
          status: 'running',
          progress: 0.1,
          completedNodes: 0,
          totalNodes: 1,
          node: null,
        });

        void listAiPathRuns({
          pathId: selectedConfig.id,
          status: 'running',
          limit: 1,
        }).then((waitResult) => {
          if (!waitResult.ok) {
            logClientError(new Error('Wait for run status failed'), {
              context: { source: 'useAiPathTriggerEvent', action: 'waitForStatusError', runId },
            });
          }
        });
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'useAiPathTriggerEvent',
            action: 'fireAiPathTriggerEventCatch',
            triggerEventId,
          },
        });
        toast('An unexpected error occurred while starting AI Path.', { variant: 'error' });
        args.onProgress?.({
          status: 'error',
          error: 'unexpected_catch',
          progress: 0,
          completedNodes: 0,
          totalNodes: 1,
          node: null,
        });
      }
    },
    [queryClient, toast, resolvePreferredActivePathId]
  );

  return {
    fireAiPathTriggerEvent,
  };
}
