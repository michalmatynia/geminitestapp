'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import type {
  AiNode,
  AiPathRunEventRecord,
  AiPathRunNodeRecord,
  AiPathRunRecord,
  AiPathRuntimeEvent,
} from '@/shared/lib/ai-paths';
import { enqueueAiPathRun, streamAiPathRun, aiPathRunNodeSchema } from '@/shared/lib/ai-paths';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { isObjectRecord } from '@/shared/utils/object-utils';
import {
  invalidateAiPathQueue,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
} from '@/shared/lib/query-invalidation';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';

import {
  mergeRuntimeStateSnapshot,
  resolveRunAt,
  resolveRunStartedAt,
  buildActivePathConfig,
} from './utils';
import { parseRuntimeState } from '../../AiPathsSettingsUtils';
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
        args.settleTransientNodeStatuses('failed');
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
      const entityId = resolveEntityIdFromContext(triggerContext);
      const entityType = resolveEntityTypeFromContext(triggerContext, entityId);
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
        args.settleTransientNodeStatuses('failed');
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
      const enqueueMeta = {
        source: 'ai_paths_ui',
        triggerLabel: args.activeTrigger ?? null,
        strictFlowMode: args.strictFlowMode !== false,
        blockedRunPolicy: args.blockedRunPolicy ?? 'fail_run',
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
        args.settleTransientNodeStatuses('failed');
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
        args.settleTransientNodeStatuses('failed');
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
        const enqueueResult = await enqueueAiPathRun(enqueuePayload);

        if (!enqueueResult.ok) {
          const enqueueError =
            typeof enqueueResult.error === 'string' && enqueueResult.error.trim().length > 0
              ? enqueueResult.error
              : 'Failed to enqueue server run.';
          const blocked =
            enqueueError.includes('Validation blocked run') ||
            enqueueError.includes('Graph compile failed') ||
            enqueueError.includes('Graph compile blocked run') ||
            enqueueError.includes('Strict flow blocked run');
          args.appendRuntimeEvent({
            source: 'server',
            kind: 'run_failed',
            level: blocked ? 'warn' : 'error',
            message: enqueueError,
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
            metadata: { error: enqueueError },
          });
          args.settleTransientNodeStatuses('failed');
          args.setRunStatus('idle');
          args.toast(enqueueError, { variant: blocked ? 'warning' : 'error' });
          stopServerRunStream();
          return;
        }

        const runPayload =
          isObjectRecord(enqueueResult.data) && isObjectRecord(enqueueResult.data['run'])
            ? (enqueueResult.data['run'] as AiPathRunRecord)
            : null;
        const runId = runPayload && typeof runPayload.id === 'string' ? runPayload.id : null;

        if (!runId) {
          const message = 'Server run was enqueued without a run id.';
          args.appendRuntimeEvent({
            source: 'server',
            kind: 'run_failed',
            level: 'error',
            message,
          });
          args.settleTransientNodeStatuses('failed');
          args.setRunStatus('idle');
          args.toast(message, { variant: 'error' });
          stopServerRunStream();
          return;
        }

        optimisticallyInsertAiPathRunInQueueCache(queryClient, runPayload);
        void invalidateAiPathQueue(queryClient);
        notifyAiPathRunEnqueued(runId);

        const runStartedAt =
          (runPayload ? resolveRunStartedAt(runPayload, args.runtimeStateRef.current) : null) ??
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
          status: 'queued',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_status',
          level: 'info',
          message: `Node ${triggerNode.title ?? triggerNode.id} queued.`,
        });

        if (runPayload?.runtimeState) {
          const initialState = parseRuntimeState(runPayload.runtimeState);
          args.setRuntimeState((prev) => mergeRuntimeStateSnapshot(prev, initialState, runPayload));
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
            args.settleTransientNodeStatuses('completed');
          } else if (terminalStatus === 'canceled') {
            args.settleTransientNodeStatuses('canceled');
          } else {
            args.settleTransientNodeStatuses('failed');
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
              args.setNodeStatus({
                nodeId: triggerNode.id,
                status: 'running',
                source: 'server',
                nodeType: triggerNode.type,
                nodeTitle: triggerNode.title ?? null,
                kind: 'node_started',
                level: 'info',
                message: `Node ${triggerNode.title ?? triggerNode.id} started.`,
              });
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
              const status = args.normalizeNodeStatus(nodeUpdate.status);
              if (!status) return;
              const nodeInputs =
                isObjectRecord(nodeUpdate.inputs) && !Array.isArray(nodeUpdate.inputs)
                  ? nodeUpdate.inputs
                  : null;
              const nodeOutputs =
                isObjectRecord(nodeUpdate.outputs) && !Array.isArray(nodeUpdate.outputs)
                  ? nodeUpdate.outputs
                  : null;
              const runtimeNode = runtimeNodeById.get(nodeId);
              const nodeTitle = runtimeNode?.title ?? nodeUpdate.nodeTitle ?? nodeId;
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
                nodeType: runtimeNode?.type ?? nodeUpdate.nodeType,
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
                const mergedNodeOutputs = {
                  ...(prev.outputs?.[nodeId] ?? {}),
                  ...(nodeOutputs ?? {}),
                  status,
                  ...(isFailed && errorMessage ? { error: errorMessage } : {}),
                };
                const nextCurrentRun = {
                  ...(prev.currentRun ?? {}),
                  id: resolvedRunId,
                  status: 'running',
                  startedAt: runStartedAtForNode ?? prev.currentRun?.startedAt ?? null,
                } as AiPathRunRecord;
                const next = {
                  ...prev,
                  currentRun: nextCurrentRun,
                  inputs: nextInputs,
                  outputs: {
                    ...(prev.outputs ?? {}),
                    [nodeId]: mergedNodeOutputs,
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
                const status =
                  args.normalizeNodeStatus(rawEvent.status) ??
                  (metadata ? args.normalizeNodeStatus(metadata['status']) : null);
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
        args.settleTransientNodeStatuses('failed');
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
