'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import type { AiNode, AiPathRunRecord, PathConfig } from '@/shared/contracts/ai-paths';
import type { ParserSampleState, UpdaterSampleState } from '@/shared/contracts/ai-paths-core/nodes';
import { type FireAiPathTriggerEventArgs } from '@/shared/contracts/ai-trigger-buttons';
import { isAppError } from '@/shared/errors/app-error';
import {
  enqueueAiPathRun,
  listAiPathRuns,
  mergeEnqueuedAiPathRunForCache,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths/api/client';
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
import { useToast } from '@/shared/ui';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import { buildTriggerContext } from './trigger-event-context';
import { handleAiPathTriggerInvalidation } from './trigger-event-invalidation';
import { recoverEnqueuedRunByRequestId } from './trigger-event-recovery';
import { resolveTriggerSelection } from './trigger-event-selection';
import {
  loadTriggerSettingsData,
  resolveRuntimeStateHint,
  coerceSampleStateMap,
  resolvePreferredPathId,
} from './trigger-event-settings';
import {
  isTimeoutMessage,
  isRecoverableTriggerEnqueueError,
  createAiPathTriggerRequestId,
} from './trigger-event-utils';

const TRIGGER_ENQUEUE_TIMEOUT_MS = 90_000;

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
          toast(
            timeoutCode
              ? 'Failed to prepare AI Path run (settings_preload_timeout). Please retry.'
              : preferredPathSettingsMissing
                ? errorMessage
                : 'Failed to load AI Path settings. Please retry.',
            { variant: 'error' }
          );
          args.onProgress?.({
            status: 'error',
            error:
              timeoutCode ||
              (preferredPathSettingsMissing ? 'preferred_path_missing' : 'settings_load_error'),
            ...(preferredPathSettingsMissing ? { message: errorMessage } : {}),
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
          if (missingPreferredPathId) {
            const missingPreferredMessage = `Trigger button is bound to missing AI Path "${missingPreferredPathId}". Update the button configuration.`;
            toast(missingPreferredMessage, { variant: 'error' });
            args.onProgress?.({
              status: 'error',
              error: 'preferred_path_missing',
              message: missingPreferredMessage,
              progress: 0,
              completedNodes: 0,
              totalNodes: 1,
              node: null,
            });
            return;
          }
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
            logClientCatch(entityJsonError, {
              source: 'useAiPathTriggerEvent',
              action: 'getEntityJson',
              triggerEventId,
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
          },
          { timeoutMs: TRIGGER_ENQUEUE_TIMEOUT_MS }
        );
        const apiDurationMs = performance.now() - apiStartedAt;

        let runId: string | null = null;
        let runRecord: AiPathRunRecord | null = null;
        let enqueueRecovered = false;

        if (!runResult.ok) {
          if (isRecoverableTriggerEnqueueError(runResult.error)) {
            const recoveredRun = await recoverEnqueuedRunByRequestId({
              pathId: selectedConfig.id,
              requestId,
            });
            if (recoveredRun) {
              runId = recoveredRun.runId;
              runRecord = recoveredRun.runRecord;
              enqueueRecovered = true;
            }
          }
        }

        if (!runResult.ok && !runId) {
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

        if (runResult.ok && !runId) {
          const resolved = resolveAiPathRunFromEnqueueResponseData(runResult.data);
          runId = resolved.runId;
          runRecord = resolved.runRecord;
        }

        if (!runId) {
          const recoveredRun = await recoverEnqueuedRunByRequestId({
            pathId: selectedConfig.id,
            requestId,
          });
          if (recoveredRun) {
            runId = recoveredRun.runId;
            runRecord = recoveredRun.runRecord;
            enqueueRecovered = true;
          }
        }

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
            level: 'info',
            pathId: selectedConfig.id,
            runId,
            requestId,
            enqueueRecovered,
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

        void listAiPathRuns({
          pathId: selectedConfig.id,
          requestId,
          status: 'running',
          limit: 1,
          fresh: true,
        }).then((waitResult) => {
          if (!waitResult.ok) {
            logClientError(new Error('Wait for run status failed'), {
              context: { source: 'useAiPathTriggerEvent', action: 'waitForStatusError', runId },
            });
            return;
          }
          const runningRunCandidate = Array.isArray(waitResult.data?.runs)
            ? (waitResult.data.runs.find(
              (candidate: unknown): boolean =>
                Boolean(candidate) &&
                typeof candidate === 'object' &&
                (candidate as { id?: unknown }).id === runId
            ) ??
              waitResult.data.runs[0] ??
              null)
            : null;
          if (!runningRunCandidate || typeof runningRunCandidate !== 'object') {
            return;
          }
          const runningRunForCache = mergeEnqueuedAiPathRunForCache({
            fallbackRun: queuedRunForCache,
            runId,
            runRecord: runningRunCandidate,
          });
          const effectiveRunningEntityId =
            typeof runningRunForCache.entityId === 'string' &&
            runningRunForCache.entityId.trim().length > 0
              ? runningRunForCache.entityId.trim()
              : effectiveQueuedEntityId;
          optimisticallyInsertAiPathRunInQueueCache(queryClient, runningRunForCache);
          notifyAiPathRunEnqueued(runId, {
            entityId: effectiveRunningEntityId,
            entityType: args.entityType,
            run: runningRunForCache,
          });
        });
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
        toast(message, { variant: 'error' });
        args.onProgress?.({
          status: 'error',
          error: 'unexpected_error',
          message,
          progress: 0,
          completedNodes: 0,
          totalNodes: 1,
          node: null,
        });
      }
    },
    [queryClient, toast, resolvePreferredActivePathId]
  );

  return { fireAiPathTriggerEvent };
}
