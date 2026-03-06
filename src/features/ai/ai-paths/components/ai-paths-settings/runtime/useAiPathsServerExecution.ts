'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRuntimeEvent,
  RuntimeHistoryEntry,
} from '@/shared/lib/ai-paths';
import {
  enqueueAiPathRun,
  streamAiPathRun,
  aiPathRunNodeSchema,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths';
import { normalizeRuntimeKernelConfigRecord } from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-config';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  invalidateAiPathQueue,
  invalidateAiPathRuns,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
} from '@/shared/lib/query-invalidation';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';

import {
  mergeRuntimeStateSnapshot,
  mergeRuntimeNodeOutputsForStatus,
  resolveRunAt,
  resolveRunStartedAt,
  buildActivePathConfig,
  resolveRuntimeNodeDisplayStatus,
} from './utils';
import { parseRuntimeState } from '../../AiPathsSettingsUtils';
import {
  createAiPathTriggerRequestId,
  isRecoverableTriggerEnqueueError,
  recoverEnqueuedRunByRequestId,
} from '@/shared/lib/ai-paths/hooks/useAiPathTriggerEvent';
import {
  collectInvalidRunEnqueuePayloadIssues,
  collectInvalidRunEnqueueSerializationIssues,
  collectInvalidRunNodePayloadIssues,
} from './payload-validation';

import type { ServerExecutionArgs } from './types';

type RuntimeEventLevel = 'debug' | 'info' | 'warn' | 'error';
type TerminalRunStatus = 'completed' | 'failed' | 'canceled' | 'dead_lettered';

const TERMINAL_RUN_STATUSES = new Set<TerminalRunStatus>([
  'completed',
  'failed',
  'canceled',
  'dead_lettered',
]);
const SERVER_EXECUTION_ENQUEUE_TIMEOUT_MS = 90_000;

const asString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const asNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const parseSsePayload = (event: MessageEvent): unknown => {
  try {
    return JSON.parse(event.data as string) as unknown;
  } catch {
    return null;
  }
};

type ApiErrorMetadata = {
  code: string | null;
  category: string | null;
  errorId: string | null;
  fingerprint: string | null;
  retryable: boolean;
  retryAfterMs: number | null;
  details: Record<string, unknown> | null;
  suggestedActions: unknown[] | null;
};

const readApiErrorMetadata = (value: unknown): ApiErrorMetadata => {
  if (!isObjectRecord(value)) {
    return {
      code: null,
      category: null,
      errorId: null,
      fingerprint: null,
      retryable: false,
      retryAfterMs: null,
      details: null,
      suggestedActions: null,
    };
  }
  const detailsRaw = value['details'];
  return {
    code: asString(value['code']),
    category: asString(value['category']),
    errorId: asString(value['errorId']),
    fingerprint: asString(value['fingerprint']),
    retryable: value['retryable'] === true,
    retryAfterMs: asNumber(value['retryAfterMs']),
    details: isObjectRecord(detailsRaw) ? detailsRaw : null,
    suggestedActions: Array.isArray(value['suggestedActions']) ? value['suggestedActions'] : null,
  };
};

const normalizeRuntimeEventLevel = (value: unknown): RuntimeEventLevel => {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }
  if (value === 'fatal') {
    return 'error';
  }
  return 'info';
};

const parseRunNodeRecord = (value: unknown): AiPathRunNodeRecord | null => {
  const parsed = aiPathRunNodeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const normalizeNodeStreamPayload = (value: unknown): AiPathRunNodeRecord[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry: unknown): AiPathRunNodeRecord[] => {
      const parsed = parseRunNodeRecord(entry);
      return parsed ? [parsed] : [];
    });
  }
  if (!isObjectRecord(value)) return [];
  if (Array.isArray(value['nodes'])) {
    return value['nodes'].flatMap((entry: unknown): AiPathRunNodeRecord[] => {
      const parsed = parseRunNodeRecord(entry);
      return parsed ? [parsed] : [];
    });
  }
  const parsed = parseRunNodeRecord(value);
  return parsed ? [parsed] : [];
};

const normalizeEventStreamPayload = (
  value: unknown
): Array<AiPathRunEventRecord | Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.filter((entry: unknown): boolean => isObjectRecord(entry)) as Array<
      AiPathRunEventRecord | Record<string, unknown>
    >;
  }
  if (!isObjectRecord(value)) return [];
  if (Array.isArray(value['events'])) {
    return value['events'].filter((entry: unknown): boolean => isObjectRecord(entry)) as Array<
      AiPathRunEventRecord | Record<string, unknown>
    >;
  }
  if (typeof value['message'] === 'string') {
    return [value];
  }
  return [];
};

const resolveEntityIdFromContext = (triggerContext: Record<string, unknown>): string | null => {
  return asString(triggerContext['entityId']) ?? asString(triggerContext['productId']) ?? null;
};

const resolveEntityTypeFromContext = (
  triggerContext: Record<string, unknown>,
  entityId: string | null
): string | null => {
  const explicit = asString(triggerContext['entityType']);
  if (explicit) return explicit;
  if (entityId && asString(triggerContext['productId'])) {
    return 'product';
  }
  return null;
};

export function useAiPathsServerExecution(args: ServerExecutionArgs) {
  const queryClient = useQueryClient();
  const { setPathConfigs } = useGraphActions();
  const serverRunActiveRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const stopServerRunStream = useCallback((): void => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    serverRunActiveRef.current = false;
    args.setRunStatus('idle');
  }, []);

  const runServerStream = useCallback(
    async (
      triggerNode: AiNode,
      triggerEvent: string,
      triggerContext: Record<string, unknown>
    ): Promise<void> => {
      if (!args.activePathId) {
        const message =
          'Cannot run path: missing path id in runtime state. Reload AI Paths and try again.';
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message,
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed before enqueue.`,
          metadata: { error: message },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        return;
      }
      if (serverRunActiveRef.current) stopServerRunStream();

      serverRunActiveRef.current = true;
      args.setRunStatus('running');
      args.resetRuntimeNodeStatuses({});
      const runtimeNodeById = new Map<string, AiNode>(
        args.normalizedNodes.map((node: AiNode): [string, AiNode] => [node.id, node])
      );
      const historyLimit = Math.max(
        1,
        Math.trunc(
          typeof args.historyRetentionPasses === 'number' ? args.historyRetentionPasses : 20
        )
      );
      const entityId = resolveEntityIdFromContext(triggerContext);
      const entityType = resolveEntityTypeFromContext(triggerContext, entityId);
      const requestIdEntityType = entityType === 'product' || entityType === 'note' ? entityType : 'custom';
      const requestId = createAiPathTriggerRequestId({
        pathId: args.activePathId,
        triggerEventId: triggerEvent,
        entityType: requestIdEntityType,
        entityId,
      });
      const nodePayloadIssues = collectInvalidRunNodePayloadIssues(args.normalizedNodes);
      if (nodePayloadIssues.length > 0) {
        const firstIssue = nodePayloadIssues[0];
        const message = firstIssue
          ? `Cannot run path: invalid node payload for ${firstIssue.nodeId} (missing ${firstIssue.missingFields.join(', ')}).`
          : 'Cannot run path: invalid node payload.';
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message,
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
          metadata: {
            error: message,
            nodePayloadIssues: nodePayloadIssues.slice(0, 5),
          },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        stopServerRunStream();
        logClientError(new Error('Invalid AI Paths run node payload'), {
          context: {
            source: 'useAiPathsServerExecution',
            action: 'validateEnqueuePayload',
            pathId: args.activePathId,
            triggerNodeId: triggerNode.id,
            nodePayloadIssues: nodePayloadIssues.slice(0, 10),
          },
        });
        return;
      }
      const normalizedRuntimeKernelConfig = isObjectRecord(args.runtimeKernelConfig)
        ? normalizeRuntimeKernelConfigRecord(args.runtimeKernelConfig)
        : null;
      const hasNormalizedRuntimeKernelConfig =
        normalizedRuntimeKernelConfig !== null &&
        Object.keys(normalizedRuntimeKernelConfig).length > 0;
      const runtimeKernelMeta = hasNormalizedRuntimeKernelConfig
        ? { runtimeKernelConfig: normalizedRuntimeKernelConfig }
        : {};
      const enqueueMeta = {
        source: 'ai_paths_ui',
        requestId,
        triggerLabel: args.activeTrigger ?? null,
        strictFlowMode: args.strictFlowMode !== false,
        blockedRunPolicy: args.blockedRunPolicy ?? 'fail_run',
        preflightRuntimeHints: {
          ...(Object.keys(args.parserSamples ?? {}).length > 0
            ? { parserSamples: args.parserSamples }
            : {}),
          ...(Object.keys(args.updaterSamples ?? {}).length > 0
            ? { updaterSamples: args.updaterSamples }
            : {}),
        },
        ...runtimeKernelMeta,
        ...(args.aiPathsValidation ? { aiPathsValidation: args.aiPathsValidation } : {}),
      };
      const enqueuePayload = {
        pathId: args.activePathId,
        pathName: args.pathName,
        nodes: args.normalizedNodes,
        edges: args.sanitizedEdges,
        triggerEvent,
        triggerNodeId: triggerNode.id,
        triggerContext,
        entityId,
        entityType,
        requestId,
        meta: enqueueMeta,
      };
      const enqueuePayloadIssues = collectInvalidRunEnqueuePayloadIssues(enqueuePayload);
      if (enqueuePayloadIssues.length > 0) {
        const firstIssue = enqueuePayloadIssues[0];
        const message = firstIssue
          ? `Cannot run path: enqueue payload is invalid (${firstIssue.path}: ${firstIssue.message}).`
          : 'Cannot run path: enqueue payload is invalid.';
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message,
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
          metadata: {
            error: message,
            enqueuePayloadIssues: enqueuePayloadIssues.slice(0, 5),
          },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        stopServerRunStream();
        logClientError(new Error('Invalid AI Paths enqueue payload'), {
          context: {
            source: 'useAiPathsServerExecution',
            action: 'validateEnqueuePayloadShape',
            pathId: args.activePathId,
            triggerNodeId: triggerNode.id,
            enqueuePayloadIssues: enqueuePayloadIssues.slice(0, 10),
          },
        });
        return;
      }
      const enqueueSerializationIssues =
        collectInvalidRunEnqueueSerializationIssues(enqueuePayload);
      if (enqueueSerializationIssues.length > 0) {
        const firstIssue = enqueueSerializationIssues[0];
        const message = firstIssue
          ? `Cannot run path: enqueue payload is not JSON-safe (${firstIssue.path}: ${firstIssue.message}).`
          : 'Cannot run path: enqueue payload is not JSON-safe.';
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message,
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
          metadata: {
            error: message,
            enqueueSerializationIssues: enqueueSerializationIssues.slice(0, 5),
          },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        stopServerRunStream();
        logClientError(new Error('Invalid AI Paths enqueue payload serialization'), {
          context: {
            source: 'useAiPathsServerExecution',
            action: 'validateEnqueuePayloadSerialization',
            pathId: args.activePathId,
            triggerNodeId: triggerNode.id,
            enqueueSerializationIssues: enqueueSerializationIssues.slice(0, 10),
          },
        });
        return;
      }

      try {
        const enqueueResult = await enqueueAiPathRun(enqueuePayload, {
          timeoutMs: SERVER_EXECUTION_ENQUEUE_TIMEOUT_MS,
        });
        let runId: string | null = null;
        let runRecord: AiPathRunRecord | null = null;
        let enqueueRecovered = false;

        if (!enqueueResult.ok) {
          if (isRecoverableTriggerEnqueueError(enqueueResult.error)) {
            const recoveredRun = await recoverEnqueuedRunByRequestId({
              pathId: args.activePathId,
              requestId,
            });
            if (recoveredRun) {
              runId = recoveredRun.runId;
              runRecord = recoveredRun.runRecord;
              enqueueRecovered = true;
            }
          }
        }

        if (!enqueueResult.ok && !runId) {
          const errorMetadata = readApiErrorMetadata(enqueueResult as unknown);
          const enqueueError =
            typeof enqueueResult.error === 'string' && enqueueResult.error.trim().length > 0
              ? enqueueResult.error
              : 'Failed to enqueue server run.';
          const enqueueErrorWithCode = errorMetadata.code
            ? `[${errorMetadata.code}] ${enqueueError}`
            : enqueueError;
          const blocked =
            enqueueError.includes('Validation blocked run') ||
            enqueueError.includes('Graph compile failed') ||
            enqueueError.includes('Graph compile blocked run') ||
            enqueueError.includes('Strict flow blocked run');
          args.appendRuntimeEvent({
            source: 'server',
            kind: 'run_failed',
            level: blocked ? 'warn' : 'error',
            message: enqueueErrorWithCode,
          });
          args.setNodeStatus({
            nodeId: triggerNode.id,
            status: blocked ? 'blocked' : 'failed',
            source: 'server',
            nodeType: triggerNode.type,
            nodeTitle: triggerNode.title ?? null,
            kind: blocked ? 'node_status' : 'node_failed',
            level: blocked ? 'warn' : 'error',
            message: blocked
              ? `Node ${triggerNode.title ?? triggerNode.id} blocked before enqueue.`
              : `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
            metadata: {
              error: enqueueError,
              ...(errorMetadata.code ? { errorCode: errorMetadata.code } : {}),
              ...(errorMetadata.category ? { errorCategory: errorMetadata.category } : {}),
              ...(errorMetadata.errorId ? { errorId: errorMetadata.errorId } : {}),
              ...(errorMetadata.fingerprint ? { fingerprint: errorMetadata.fingerprint } : {}),
              ...(errorMetadata.retryable ? { retryable: true } : {}),
              ...(typeof errorMetadata.retryAfterMs === 'number'
                ? { retryAfterMs: errorMetadata.retryAfterMs }
                : {}),
              ...(errorMetadata.details ? { details: errorMetadata.details } : {}),
              ...(errorMetadata.suggestedActions
                ? { suggestedActions: errorMetadata.suggestedActions }
                : {}),
            },
          });
          args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
          args.setRunStatus('idle');
          args.toast(enqueueErrorWithCode, { variant: blocked ? 'warning' : 'error' });
          stopServerRunStream();
          return;
        }

        if (enqueueResult.ok && !runId) {
          const resolved = resolveAiPathRunFromEnqueueResponseData(enqueueResult.data);
          runId = resolved.runId;
          runRecord = resolved.runRecord;
        }

        if (!runId) {
          const recoveredRun = await recoverEnqueuedRunByRequestId({
            pathId: args.activePathId,
            requestId,
          });
          if (recoveredRun) {
            runId = recoveredRun.runId;
            runRecord = recoveredRun.runRecord;
            enqueueRecovered = true;
          }
        }

        if (!runId) {
          const message = 'Server run was enqueued without a run id.';
          args.appendRuntimeEvent({
            source: 'server',
            kind: 'run_failed',
            level: 'error',
            message,
          });
          args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
          args.setRunStatus('idle');
          args.toast(message, { variant: 'error' });
          stopServerRunStream();
          return;
        }

        if (enqueueRecovered) {
          args.appendRuntimeEvent({
            source: 'server',
            kind: 'run_warning',
            level: 'warn',
            message: 'Recovered queued server run after losing the enqueue response.',
          });
          logClientError(new Error(`Recovered AI Paths server enqueue response (${runId})`), {
            context: {
              source: 'useAiPathsServerExecution',
              action: 'enqueueRecovered',
              pathId: args.activePathId,
              triggerNodeId: triggerNode.id,
              requestId,
              runId,
            },
          });
        }

        const queuedRunForCache = runRecord ?? {
          id: runId,
          pathId: args.activePathId,
          pathName: args.pathName ?? null,
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entityId,
          entityType,
        };
        optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRunForCache);
        void invalidateAiPathQueue(queryClient);
        void invalidateAiPathRuns(queryClient);
        notifyAiPathRunEnqueued(runId, {
          entityId,
          entityType,
        });

        const runStartedAt =
          (runRecord ? resolveRunStartedAt(runRecord, args.runtimeStateRef.current) : null) ??
          new Date().toISOString();

        if (args.currentRunIdRef) {
          args.currentRunIdRef.current = runId;
        }
        if (args.currentRunStartedAtRef) {
          args.currentRunStartedAtRef.current = runStartedAt;
        }
        args.setCurrentRunId?.(runId);

        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_started',
          level: 'info',
          message: 'Server run queued.',
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'completed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_finished',
          level: 'info',
          message: `Node ${triggerNode.title ?? triggerNode.id} completed.`,
        });

        if (runRecord?.runtimeState) {
          const initialState = parseRuntimeState(runRecord.runtimeState);
          args.setRuntimeState((prev) => mergeRuntimeStateSnapshot(prev, initialState, runRecord));
        }

        let terminalHandled = false;

        const finalizeRun = (
          terminalStatus: 'completed' | 'failed' | 'canceled',
          options?: {
            run?: AiPathRunRecord | null;
            message?: string;
            finishedAt?: string | null;
            level?: RuntimeEventLevel;
          }
        ): void => {
          if (terminalHandled) return;
          terminalHandled = true;
          const runFromOptions = options?.run ?? null;
          const finishedAt =
            options?.finishedAt ??
            (runFromOptions ? resolveRunAt(runFromOptions) : new Date().toISOString());
          const kind =
            terminalStatus === 'completed'
              ? 'run_completed'
              : terminalStatus === 'canceled'
                ? 'run_canceled'
                : 'run_failed';
          const level =
            options?.level ??
            (terminalStatus === 'completed'
              ? 'info'
              : terminalStatus === 'canceled'
                ? 'warn'
                : 'error');
          const message =
            options?.message ??
            (terminalStatus === 'completed'
              ? 'Server run completed.'
              : terminalStatus === 'canceled'
                ? 'Server run canceled.'
                : 'Server run failed.');
          args.appendRuntimeEvent({
            source: 'server',
            kind,
            level,
            timestamp: finishedAt,
            message,
          });
          args.setLastRunAt(finishedAt);
          if (args.activePathId) {
            setPathConfigs((prev) => ({
              ...prev,
              [args.activePathId!]: {
                ...(prev[args.activePathId!] ??
                  buildActivePathConfig({
                    activePathId: args.activePathId,
                    pathName: args.pathName,
                    pathDescription: args.pathDescription,
                    activeTrigger: args.activeTrigger,
                    executionMode: args.executionMode,
                    runMode: args.runMode,
                    strictFlowMode: args.strictFlowMode,
                    blockedRunPolicy: args.blockedRunPolicy,
                    aiPathsValidation: args.aiPathsValidation,
                    nodes: args.normalizedNodes,
                    edges: args.sanitizedEdges,
                    updatedAt: finishedAt,
                    parserSamples: args.parserSamples,
                    updaterSamples: args.updaterSamples,
                    runtimeState: args.runtimeStateRef.current,
                    lastRunAt: finishedAt,
                    runCount: 1,
                  })),
                runtimeState: args.runtimeStateRef.current,
                lastRunAt: finishedAt,
                runCount: Math.max(1, Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1)),
              },
            }));
          }
          if (terminalStatus === 'completed') {
            args.settleTransientNodeStatuses('completed', {}, { settleQueued: true });
          } else if (terminalStatus === 'canceled') {
            args.settleTransientNodeStatuses('canceled', {}, { settleQueued: true });
          } else {
            args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
          }
          args.setRunStatus('idle');
          stopServerRunStream();
          if (args.currentRunIdRef) {
            args.currentRunIdRef.current = null;
          }
          if (args.currentRunStartedAtRef) {
            args.currentRunStartedAtRef.current = null;
          }
          args.setCurrentRunId?.(null);
          void invalidateAiPathRuns(queryClient);
          if (terminalStatus === 'completed') {
            args.openRunDetail?.(runId);
          }
        };

        const eventSource = streamAiPathRun(runId);
        eventSourceRef.current = eventSource;

        eventSource.addEventListener('run', (event: Event): void => {
          try {
            if (!(event instanceof MessageEvent)) return;
            const payload = parseSsePayload(event);
            if (!isObjectRecord(payload)) return;
            const run = payload as AiPathRunRecord;
            const latestRunStartedAt =
              resolveRunStartedAt(run, args.runtimeStateRef.current) ??
              args.currentRunStartedAtRef?.current ??
              runStartedAt;
            if (args.currentRunStartedAtRef && latestRunStartedAt) {
              args.currentRunStartedAtRef.current = latestRunStartedAt;
            }
            if (run.runtimeState) {
              const nextState = parseRuntimeState(run.runtimeState);
              args.setRuntimeState((prev) => mergeRuntimeStateSnapshot(prev, nextState, run));
            }
            const runStatus = asString(run.status);
            if (runStatus === 'running') {
              return;
            }
            if (!runStatus || !TERMINAL_RUN_STATUSES.has(runStatus as TerminalRunStatus)) {
              return;
            }
            if (runStatus === 'completed') {
              finalizeRun('completed', { run });
              return;
            }
            if (runStatus === 'canceled') {
              finalizeRun('canceled', { run });
              return;
            }
            finalizeRun('failed', {
              run,
              message:
                run.errorMessage ??
                run.error ??
                (runStatus === 'dead_lettered'
                  ? 'Run moved to dead letter queue.'
                  : 'Server run failed.'),
            });
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'parseRunEvent',
                runId,
              },
            });
          }
        });

        eventSource.addEventListener('nodes', (event: Event): void => {
          try {
            if (!(event instanceof MessageEvent)) return;
            const payload = parseSsePayload(event);
            const nodeUpdates = normalizeNodeStreamPayload(payload);
            nodeUpdates.forEach((nodeUpdate: AiPathRunNodeRecord): void => {
              const nodeId = asString(nodeUpdate.nodeId);
              if (!nodeId) return;
              const nodeInputs =
                isObjectRecord(nodeUpdate.inputs) && !Array.isArray(nodeUpdate.inputs)
                  ? nodeUpdate.inputs
                  : null;
              const nodeOutputs =
                isObjectRecord(nodeUpdate.outputs) && !Array.isArray(nodeUpdate.outputs)
                  ? nodeUpdate.outputs
                  : null;
              const nodeStatus = args.normalizeNodeStatus(nodeUpdate.status);
              const outputStatus = nodeOutputs
                ? args.normalizeNodeStatus(nodeOutputs['status'])
                : null;
              const status = resolveRuntimeNodeDisplayStatus({
                status:
                  outputStatus === 'waiting_callback' ? outputStatus : (nodeStatus ?? outputStatus),
                outputs: nodeOutputs,
              });
              if (!status) return;
              const runtimeNode = runtimeNodeById.get(nodeId);
              const nodeTitle = runtimeNode?.title ?? nodeUpdate.nodeTitle ?? nodeId;
              const nodeType = runtimeNode?.type ?? nodeUpdate.nodeType ?? 'unknown';
              const errorMessage = asString(nodeUpdate.errorMessage) ?? asString(nodeUpdate.error);
              const runStartedAtForNode =
                asString(nodeUpdate.startedAt) ??
                args.currentRunStartedAtRef?.current ??
                runStartedAt;
              const resolvedRunId = asString(nodeUpdate.runId) ?? runId;
              const iteration = asNumber(nodeUpdate.attempt);
              const isFailed = status === 'failed';
              const isWarningStatus = status === 'blocked' || status === 'skipped';
              args.setNodeStatus({
                nodeId,
                status,
                source: 'server',
                nodeType,
                nodeTitle: nodeTitle ?? null,
                iteration: iteration ?? undefined,
                kind: isFailed ? 'node_failed' : 'node_status',
                level: isFailed ? 'error' : isWarningStatus ? 'warn' : 'info',
                message:
                  isFailed && errorMessage
                    ? `Node ${nodeTitle} failed: ${errorMessage}`
                    : `Node ${nodeTitle} ${args.formatStatusLabel(status)}.`,
                metadata:
                  errorMessage || nodeUpdate.outputs
                    ? {
                      ...(errorMessage ? { error: errorMessage } : {}),
                      ...(nodeUpdate.outputs ? { outputs: nodeUpdate.outputs } : {}),
                    }
                    : undefined,
              });
              args.setRuntimeState((prev) => {
                const nextInputs = {
                  ...(prev.inputs ?? {}),
                  ...(nodeInputs ? { [nodeId]: nodeInputs } : {}),
                };
                const mergedNodeOutputs = mergeRuntimeNodeOutputsForStatus({
                  previous: prev.outputs?.[nodeId],
                  next: {
                    ...(nodeOutputs ?? {}),
                    ...(isFailed && errorMessage ? { error: errorMessage } : {}),
                  },
                  status,
                });
                const nextCurrentRun = {
                  ...(prev.currentRun ?? {}),
                  id: resolvedRunId,
                  status: 'running',
                  startedAt: runStartedAtForNode ?? prev.currentRun?.startedAt ?? null,
                } as AiPathRunRecord;
                const previousHistory = prev.history ?? {};
                const previousNodeHistory = Array.isArray(previousHistory[nodeId])
                  ? previousHistory[nodeId]
                  : [];
                const historyEntry: RuntimeHistoryEntry = {
                  timestamp: new Date().toISOString(),
                  pathId: args.activePathId ?? null,
                  pathName: args.pathName ?? null,
                  nodeId,
                  nodeType,
                  nodeTitle: nodeTitle ?? null,
                  status,
                  iteration: iteration ?? previousNodeHistory.length + 1,
                  inputs: nodeInputs ? { ...nodeInputs } : {},
                  outputs: { ...mergedNodeOutputs },
                  inputHash: null,
                  inputsFrom: [],
                  outputsTo: [],
                };
                const nextNodeHistory = [...previousNodeHistory, historyEntry].slice(-historyLimit);
                const next = {
                  ...prev,
                  currentRun: nextCurrentRun,
                  inputs: nextInputs,
                  outputs: {
                    ...(prev.outputs ?? {}),
                    [nodeId]: mergedNodeOutputs,
                  },
                  history: {
                    ...previousHistory,
                    [nodeId]: nextNodeHistory,
                  },
                };
                args.runtimeStateRef.current = next;
                return next;
              });
            });
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'parseNodeEvent',
                runId,
              },
            });
          }
        });

        eventSource.addEventListener('events', (event: Event): void => {
          try {
            if (!(event instanceof MessageEvent)) return;
            const payload = parseSsePayload(event);
            const rawEvents = normalizeEventStreamPayload(payload);
            const streamedEvents: AiPathRuntimeEvent[] = [];
            rawEvents.forEach(
              (rawEvent: AiPathRunEventRecord | Record<string, unknown>, index: number): void => {
                if (!isObjectRecord(rawEvent)) return;
                const message = asString(rawEvent.message);
                if (!message) return;
                const metadata = isObjectRecord(rawEvent.metadata) ? rawEvent.metadata : null;
                const nodeId =
                  asString(rawEvent.nodeId) ??
                  (metadata ? asString(metadata['nodeId']) : null) ??
                  undefined;
                const runtimeNode = nodeId ? runtimeNodeById.get(nodeId) : null;
                const status = resolveRuntimeNodeDisplayStatus({
                  status:
                    args.normalizeNodeStatus(rawEvent.status) ??
                    (metadata ? args.normalizeNodeStatus(metadata['status']) : null),
                  metadata,
                });
                const iteration =
                  asNumber(rawEvent.iteration) ??
                  (metadata ? asNumber(metadata['iteration']) : null);
                const rawTimestamp = asString(rawEvent['createdAt']) ?? new Date().toISOString();
                streamedEvents.push({
                  id:
                    asString(rawEvent.id) ??
                    `server_evt_${Date.now()}_${index}_${Math.random().toString(16).slice(2, 8)}`,
                  timestamp: rawTimestamp,
                  type: 'log',
                  source: 'server',
                  kind: 'log',
                  level: normalizeRuntimeEventLevel(rawEvent.level),
                  message,
                  ...(nodeId ? { nodeId } : {}),
                  ...(runtimeNode?.type ? { nodeType: runtimeNode.type } : {}),
                  ...(runtimeNode?.title || rawEvent['nodeTitle']
                    ? { nodeTitle: runtimeNode?.title ?? asString(rawEvent['nodeTitle']) }
                    : {}),
                  ...(status ? { status } : {}),
                  ...(iteration !== null ? { iteration } : {}),
                  ...(metadata ? { metadata } : {}),
                });
              }
            );
            if (streamedEvents.length > 0) {
              args.setRuntimeEvents((prev) => [...prev, ...streamedEvents]);
            }
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'parseEventsEvent',
                runId,
              },
            });
          }
        });

        eventSource.addEventListener('done', (event: Event): void => {
          try {
            if (!(event instanceof MessageEvent)) return;
            const payload = parseSsePayload(event);
            const status = isObjectRecord(payload) ? asString(payload['status']) : null;
            if (status === 'completed') {
              finalizeRun('completed');
              return;
            }
            if (status === 'canceled') {
              finalizeRun('canceled');
              return;
            }
            finalizeRun('failed', {
              message:
                status === 'dead_lettered'
                  ? 'Run moved to dead letter queue.'
                  : 'Server run failed.',
            });
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'parseDoneEvent',
                runId,
              },
            });
          }
        });

        eventSource.addEventListener('error', (event: Event): void => {
          if (!(event instanceof MessageEvent)) return;
          try {
            const payload = parseSsePayload(event);
            const errorMessage = isObjectRecord(payload)
              ? (asString(payload['error']) ?? asString(payload['message']))
              : null;
            finalizeRun('failed', {
              message: errorMessage ? `Server run failed: ${errorMessage}` : 'Server run failed.',
            });
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'parseErrorEvent',
                runId,
              },
            });
          }
        });

        eventSource.onerror = (err: Event): void => {
          if (terminalHandled || !serverRunActiveRef.current) return;
          // readyState CONNECTING (0) = browser is auto-retrying after a transient disconnect.
          // Do not finalize — node statuses remain as-is; the stream will catch up on reconnect.
          if (eventSource.readyState === EventSource.CONNECTING) {
            logClientError(new Error('Server run stream disconnected — reconnecting'), {
              context: {
                source: 'useAiPathsServerExecution',
                action: 'eventSourceOnError',
                runId,
                readyState: eventSource.readyState,
                error: String(err),
              },
            });
            args.appendRuntimeEvent({
              source: 'server',
              kind: 'run_warning',
              level: 'warn',
              message: 'Stream disconnected — attempting to reconnect...',
            });
            return;
          }
          // readyState CLOSED (2) — permanent failure; finalize the run.
          logClientError(new Error('Server run stream closed'), {
            context: {
              source: 'useAiPathsServerExecution',
              action: 'eventSourceOnError',
              runId,
              error: String(err),
            },
          });
          finalizeRun('failed', { message: 'Server stream connection lost.' });
        };
      } catch (error) {
        const message =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : 'Failed to enqueue server run.';
        args.appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message,
        });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
          metadata: { error: message },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        stopServerRunStream();
        logClientError(error, {
          context: {
            source: 'useAiPathsServerExecution',
            action: 'runServerStream',
            pathId: args.activePathId,
            triggerNodeId: triggerNode.id,
          },
        });
      }
    },
    [args, queryClient, setPathConfigs, stopServerRunStream]
  );

  return {
    serverRunActiveRef,
    runServerStream,
    stopServerRunStream,
  };
}
