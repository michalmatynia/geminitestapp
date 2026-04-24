'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type { AiNode, AiPathRunRecord, PathConfig } from '@/shared/contracts/ai-paths';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/contracts/ai-paths-core/nodes';
import { type FireAiPathTriggerEventArgs } from '@/shared/contracts/ai-trigger-buttons';
import { isAppError } from '@/shared/errors/app-error';
import {
  enqueueAiPathRun,
  mergeEnqueuedAiPathRunForCache,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths/api/client';
import { useOptionalContextRegistryPageEnvelope } from '@/shared/lib/ai-context-registry/page-context';
import { AI_PATHS_UI_STATE_KEY } from '@/shared/lib/ai-paths/core/constants';
import { resolveHistoryRetentionPasses } from '@/shared/lib/ai-paths/core/normalization/trigger-normalization';
import { evaluateRunPreflight } from '@/shared/lib/ai-paths/core/utils/run-preflight';
import { normalizeAiPathsValidationConfig } from '@/shared/lib/ai-paths/core/validation-engine/defaults';
import {
  invalidateAiPathsSettingsCache,
  updateAiPathsSetting,
} from '@/shared/lib/ai-paths/settings-store-client';
import {
  invalidateAiPathSettings,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
} from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui/primitives.public';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import { buildTriggerContext } from './trigger-event-context';
import { handleAiPathTriggerInvalidation } from './trigger-event-invalidation';
import { resolveTriggerSelection } from './trigger-event-selection';
import {
  loadTriggerSettingsData,
  resolveRuntimeStateHint,
  coerceSampleStateMap,
  resolvePreferredPathId,
} from './trigger-event-settings';
import {
  isTimeoutMessage,
  createAiPathTriggerRequestId,
} from './trigger-event-utils';
import { shouldEmbedTriggerEntitySnapshot } from './trigger-event-sanitization';

const TRIGGER_ENQUEUE_TIMEOUT_MS = 90_000;
const PREFLIGHT_CACHE_MAX_ENTRIES = 32;
const PRODUCT_SAVED_CONFIG_WARNING_LOCATIONS = new Set([
  'product_form_footer',
  'product_form_header',
  'product_list',
  'product_list_header',
  'product_list_item',
  'product_marketplace_copy_row',
  'product_modal',
  'product_parameter_row',
  'product_row',
]);

const resolveSavedDefaultModelWarning = (args: {
  entityType: FireAiPathTriggerEventArgs['entityType'];
  source?: FireAiPathTriggerEventArgs['source'];
  selectedConfig: PathConfig;
}): string | null => {
  if (args.entityType !== 'product') {
    return null;
  }

  const location =
    typeof args.source?.location === 'string' ? args.source.location.trim().toLowerCase() : '';
  if (!location || !PRODUCT_SAVED_CONFIG_WARNING_LOCATIONS.has(location)) {
    return null;
  }

  const modelNodesUsingBrainDefault = args.selectedConfig.nodes.filter((node: AiNode): boolean => {
    if (node.type !== 'model') {
      return false;
    }
    const modelId =
      typeof node.config?.model?.modelId === 'string' ? node.config.model.modelId.trim() : '';
    return modelId.length === 0;
  });

  if (modelNodesUsingBrainDefault.length === 0) {
    return null;
  }

  if (modelNodesUsingBrainDefault.length === 1) {
    const modelNode = modelNodesUsingBrainDefault[0];
    const nodeLabel = modelNode?.title?.trim() || modelNode?.id || 'model node';
    return `This run uses the saved AI Path config. Saved model node "${nodeLabel}" still relies on AI Brain default. Save an explicit model in AI Paths if you want this trigger to use Gemma consistently.`;
  }

  return `This run uses the saved AI Path config. ${modelNodesUsingBrainDefault.length} saved model nodes still rely on AI Brain default. Save explicit models in AI Paths if you want this trigger to avoid the default model consistently.`;
};

export const resolveCurrentActivePathId = (args: {
  preferredActivePathId: string | null;
  uiState: Record<string, unknown> | null;
}): string | null => {
  const preferredActivePathId =
    typeof args.preferredActivePathId === 'string' ? args.preferredActivePathId.trim() : '';
  if (preferredActivePathId.length > 0) {
    return preferredActivePathId;
  }

  const uiStateActivePathId =
    typeof args.uiState?.['activePathId'] === 'string' ? args.uiState['activePathId'].trim() : '';
  return uiStateActivePathId.length > 0 ? uiStateActivePathId : null;
};

type CachedPreflightReport = ReturnType<typeof evaluateRunPreflight>;

const resolvePreflightCacheKey = (args: {
  selectedConfig: PathConfig;
  triggerNodeId: string;
}): string => {
  const updatedAt =
    typeof args.selectedConfig.updatedAt === 'string' && args.selectedConfig.updatedAt.trim().length > 0
      ? args.selectedConfig.updatedAt.trim()
      : 'unknown';
  return `${args.selectedConfig.id}::${updatedAt}::${args.triggerNodeId}`;
};

const readCachedPreflight = (
  cache: Map<string, CachedPreflightReport>,
  cacheKey: string
): CachedPreflightReport | null => {
  const cached = cache.get(cacheKey) ?? null;
  if (!cached) return null;
  cache.delete(cacheKey);
  cache.set(cacheKey, cached);
  return cached;
};

const writeCachedPreflight = (
  cache: Map<string, CachedPreflightReport>,
  cacheKey: string,
  report: CachedPreflightReport
): void => {
  if (cache.has(cacheKey)) {
    cache.delete(cacheKey);
  }
  cache.set(cacheKey, report);
  if (cache.size <= PREFLIGHT_CACHE_MAX_ENTRIES) {
    return;
  }
  const oldestKey = cache.keys().next().value;
  if (typeof oldestKey === 'string') {
    cache.delete(oldestKey);
  }
};

export function useAiPathTriggerEvent(): {
  fireAiPathTriggerEvent: (args: FireAiPathTriggerEventArgs) => Promise<void>;
  } {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const pageContextRegistry = useOptionalContextRegistryPageEnvelope();
  const preflightCacheRef = useRef<Map<string, CachedPreflightReport>>(new Map());

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
      const finishLaunch = (): void => {
        args.onFinished?.();
      };
      const reportLaunchError = (payload: {
        toastMessage?: string | null | undefined;
        toastVariant?: 'default' | 'info' | 'warning' | 'error';
        errorCode: string;
        progressMessage?: string | null | undefined;
      }): void => {
        const toastMessage =
          typeof payload.toastMessage === 'string' ? payload.toastMessage.trim() : '';
        const progressMessage =
          typeof payload.progressMessage === 'string' ? payload.progressMessage.trim() : '';
        const callbackMessage = progressMessage || toastMessage || payload.errorCode;

        if (toastMessage.length > 0) {
          toast(toastMessage, { variant: payload.toastVariant ?? 'error' });
        }
        args.onError?.(callbackMessage);
        args.onProgress?.({
          status: 'error',
          error: payload.errorCode,
          ...(progressMessage.length > 0 ? { message: progressMessage } : {}),
          progress: 0,
          completedNodes: 0,
          totalNodes: 1,
          node: null,
        });
        finishLaunch();
      };

      const triggerEventId = args.triggerEventId.trim();
      if (!triggerEventId) {
        reportLaunchError({
          toastMessage: 'Missing trigger id.',
          toastVariant: 'error',
          errorCode: 'missing_trigger_id',
        });
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
          const appErrorMeta =
            isAppError(settingsError) && settingsError.meta ? settingsError.meta : null;
          const preferredPathSettingsMissing =
            appErrorMeta?.['reason'] === 'preferred_path_config_missing';
          logClientCatch(settingsError, {
            source: 'useAiPathTriggerEvent',
            action: 'loadTriggerSettingsData',
            timeoutCode,
            preferredPathId: args.preferredPathId ?? null,
          });
          reportLaunchError({
            toastMessage: timeoutCode
              ? 'Failed to prepare AI Path run (settings_preload_timeout). Please retry.'
              : preferredPathSettingsMissing
                ? errorMessage
                : 'Failed to load AI Path settings. Please retry.',
            toastVariant: 'error',
            errorCode:
              timeoutCode ||
              (preferredPathSettingsMissing ? 'preferred_path_missing' : 'settings_load_error'),
            progressMessage: preferredPathSettingsMissing ? errorMessage : null,
          });
          return;
        }
        const settingsDurationMs = performance.now() - settingsStartedAt;

        const selectionStartedAt = performance.now();
        let triggerCandidates: PathConfig[] = [];
        let activeTriggerCandidates: PathConfig[] = [];
        let selectedConfig: PathConfig | null = null;
        let uiState: Record<string, unknown> | null = null;
        let missingPreferredPathId: string | null = null;
        try {
          const selection = await resolveTriggerSelection(settingsData, triggerEventId, {
            preferredPathId: args.preferredPathId,
            preferredActivePathId,
          });
          triggerCandidates = selection.triggerCandidates;
          activeTriggerCandidates = selection.activeTriggerCandidates;
          selectedConfig = selection.selectedConfig;
          uiState = selection.uiState;
          missingPreferredPathId = selection.missingPreferredPathId;
        } catch (selectionError) {
          const message =
            selectionError instanceof Error
              ? selectionError.message
              : 'AI Path trigger settings are invalid.';
          logClientCatch(selectionError, {
            source: 'useAiPathTriggerEvent',
            action: 'resolveTriggerSelection',
            triggerEventId,
          });
          reportLaunchError({
            toastMessage: message,
            toastVariant: 'error',
            errorCode: 'trigger_settings_invalid',
            progressMessage: message,
          });
          return;
        }
        const selectionDurationMs = performance.now() - selectionStartedAt;

        if (!selectedConfig) {
          if (missingPreferredPathId) {
            const missingPreferredMessage = `Trigger button is bound to missing AI Path "${missingPreferredPathId}". Update the button configuration.`;
            reportLaunchError({
              toastMessage: missingPreferredMessage,
              toastVariant: 'error',
              errorCode: 'preferred_path_missing',
              progressMessage: missingPreferredMessage,
            });
            return;
          }
          if (triggerCandidates.length === 0) {
            reportLaunchError({
              toastMessage: `No AI Path configured for trigger: ${triggerEventId}`,
              toastVariant: 'warning',
              errorCode: 'no_path_configured',
            });
            return;
          }
          if (activeTriggerCandidates.length === 0) {
            reportLaunchError({
              toastMessage: 'All AI Paths for this trigger are disabled.',
              toastVariant: 'warning',
              errorCode: 'path_disabled',
            });
            return;
          }
          reportLaunchError({
            toastMessage: 'Multiple active paths for trigger. Please specify preferredPathId.',
            toastVariant: 'warning',
            errorCode: 'ambiguous_path_selection',
          });
          return;
        }

        const historyRetentionPasses = resolveHistoryRetentionPasses(settingsData);
        const triggerNode = selectedConfig.nodes.find((node: AiNode) => {
          if (node.type !== 'trigger') return false;
          const configuredEvent = node.config?.trigger?.event ?? 'manual';
          return configuredEvent === triggerEventId;
        });

        if (!triggerNode) {
          reportLaunchError({
            toastMessage: `Trigger node not found in path: ${selectedConfig.name}`,
            toastVariant: 'error',
            errorCode: 'trigger_node_not_found',
          });
          return;
        }

        let entityJson: Record<string, unknown> | null = null;
        if (
          typeof args.getEntityJson === 'function' &&
          shouldEmbedTriggerEntitySnapshot({
            mode: triggerNode.config?.trigger?.entitySnapshotMode,
            entityType: args.entityType,
            entityId: args.entityId,
            sourceLocation: args.source?.location,
          })
        ) {
          try {
            entityJson = args.getEntityJson();
          } catch (entityJsonError) {
            logClientCatch(entityJsonError, {
              source: 'useAiPathTriggerEvent',
              action: 'getEntityJson',
              triggerEventId,
            });
          }
        }

        const savedDefaultModelWarning = resolveSavedDefaultModelWarning({
          entityType: args.entityType,
          source: args.source,
          selectedConfig,
        });
        if (savedDefaultModelWarning) {
          toast(savedDefaultModelWarning, { variant: 'info' });
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
        const preflightCacheKey = resolvePreflightCacheKey({
          selectedConfig,
          triggerNodeId: triggerNode.id,
        });
        const preflight =
          readCachedPreflight(preflightCacheRef.current, preflightCacheKey) ??
          (() => {
            const computed = evaluateRunPreflight({
              nodes: selectedConfig.nodes,
              edges: selectedConfig.edges,
              aiPathsValidation: validationConfig,
              strictFlowMode: selectedConfig.strictFlowMode ?? true,
              triggerNodeId: triggerNode.id,
              ...(parserSamples ? { parserSamples } : {}),
              ...(updaterSamples ? { updaterSamples } : {}),
              mode: 'full',
            });
            writeCachedPreflight(preflightCacheRef.current, preflightCacheKey, computed);
            return computed;
          })();
        const preflightDurationMs = performance.now() - preflightStartedAt;

        if (preflight.shouldBlock) {
          const preflightMessage = preflight.blockMessage ?? 'Unknown preflight error.';
          reportLaunchError({
            toastMessage: `Path validation failed: ${preflightMessage}`,
            toastVariant: 'error',
            errorCode: 'preflight_failed',
            progressMessage: preflightMessage,
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
        const requestId = createAiPathTriggerRequestId({
          pathId: selectedConfig.id,
          triggerEventId,
          entityType: args.entityType,
          entityId: args.entityId,
        });
        const runResult = await enqueueAiPathRun(
          {
            pathId: selectedConfig.id,
            pathName: selectedConfig.name,
            nodes: selectedConfig.nodes,
            edges: selectedConfig.edges,
            triggerEvent: triggerEventId,
            triggerNodeId: triggerNode.id,
            triggerContext,
            entityId: args.entityId,
            entityType: args.entityType,
            requestId,
            meta: {
              source: 'trigger_button',
              requestId,
              historyRetentionPasses,
              strictFlowMode: selectedConfig.strictFlowMode !== false,
              aiPathsValidation: normalizeAiPathsValidationConfig(
                selectedConfig.aiPathsValidation ?? null
              ),
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
                requestId,
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
            ...(pageContextRegistry ? { contextRegistry: pageContextRegistry } : {}),
          },
          { timeoutMs: TRIGGER_ENQUEUE_TIMEOUT_MS }
        );
        const apiDurationMs = performance.now() - apiStartedAt;

        let runId: string | null = null;
        let runRecord: AiPathRunRecord | null = null;

        if (!runResult.ok && !runId) {
          reportLaunchError({
            toastMessage: `Failed to start AI Path: ${runResult.error || 'API Error'}`,
            toastVariant: 'error',
            errorCode: 'api_error',
            progressMessage: runResult.error as string | undefined,
          });
          return;
        }

        if (runResult.ok && !runId) {
          const resolved = resolveAiPathRunFromEnqueueResponseData(runResult.data);
          runId = resolved.runId;
          runRecord = resolved.runRecord;
        }

        if (!runId) {
          reportLaunchError({
            toastMessage: 'Failed to start AI Path: invalid run identifier from API.',
            toastVariant: 'error',
            errorCode: 'api_error',
            progressMessage: 'Invalid run identifier returned by enqueue endpoint.',
          });
          return;
        }

        const totalPrepMs = performance.now() - phaseStartedAt;

        logClientError(new Error(`AI Path started: ${selectedConfig.name} (${runId})`), {
          context: {
            source: 'useAiPathTriggerEvent',
            action: 'fireSuccess',
            level: 'info',
            pathId: selectedConfig.id,
            runId,
            requestId,
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

        const queuedRunFallback: AiPathRunRecord = {
          id: runId,
          pathId: selectedConfig.id,
          pathName: selectedConfig.name,
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          requestId,
          triggerNodeId: triggerNode.id,
          triggerEvent: triggerEventId,
          entityId: args.entityId ?? null,
          entityType: args.entityType,
          meta: {
            source: 'trigger_button',
            requestId,
          },
        };
        const queuedRunForCache = mergeEnqueuedAiPathRunForCache({
          fallbackRun: queuedRunFallback,
          runId,
          runRecord,
        });
        const effectiveQueuedEntityId =
          typeof queuedRunForCache.entityId === 'string' &&
          queuedRunForCache.entityId.trim().length > 0
            ? queuedRunForCache.entityId.trim()
            : (args.entityId ?? null);
        optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRunForCache);

        await handleAiPathTriggerInvalidation({
          queryClient,
          runId,
          run: queuedRunForCache,
          entityType: args.entityType,
          entityId: effectiveQueuedEntityId,
        });
        notifyAiPathRunEnqueued(runId, {
          entityId: effectiveQueuedEntityId,
          entityType: args.entityType,
          run: queuedRunForCache,
        });

        const currentActivePathId = resolveCurrentActivePathId({
          preferredActivePathId,
          uiState,
        });

        if (selectedConfig.id !== currentActivePathId) {
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
        finishLaunch();
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'An unexpected error occurred while starting AI Path.';
        logClientCatch(error, {
          source: 'useAiPathTriggerEvent',
          action: 'fireError',
          triggerEventId,
        });
        reportLaunchError({
          toastMessage: message,
          toastVariant: 'error',
          errorCode: 'unexpected_error',
          progressMessage: message,
        });
      }
    },
    [pageContextRegistry, queryClient, toast, resolvePreferredActivePathId]
  );

  return { fireAiPathTriggerEvent };
}
