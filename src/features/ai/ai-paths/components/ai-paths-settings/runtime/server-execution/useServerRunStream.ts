'use client';

import { useCallback, useRef } from 'react';

import { isTerminalAiPathRunStatus } from '@/features/ai/ai-paths/lib/path-run-status';
import type { AiPathRunNodeRecord, AiPathRunRecord, AiPathRunEventRecord, AiPathRuntimeEvent, RuntimeHistoryEntry } from '@/shared/lib/ai-paths';
import { parseRuntimeState } from '@/shared/lib/ai-paths/core/utils/runtime-state';
import { streamAiPathRun } from '@/shared/lib/ai-paths';
import { isObjectRecord } from '@/shared/utils/object-utils';
import { logClientCatch, logClientError } from '@/shared/utils/observability/client-error-logger';

import {
  mergeRuntimeStateSnapshot,
  mergeRuntimeNodeOutputsForStatus,
  resolveRunStartedAt,
  resolveRuntimeNodeDisplayStatus,
} from '../utils';
import {
  asString,
  asNumber,
  parseSsePayload,
  normalizeRuntimeEventLevel,
  normalizeNodeStreamPayload,
  normalizeEventStreamPayload,
} from './helpers';

import type { ServerExecutionArgs, ServerRunFinalizeOptions, ServerRunStreamContext } from './types';

export function useServerRunStream(
  args: ServerExecutionArgs,
  serverRunActiveRef: React.MutableRefObject<boolean>,
  finalizeRun: (status: 'completed' | 'failed' | 'canceled', options?: ServerRunFinalizeOptions) => void
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const removeListenersRef = useRef<(() => void) | null>(null);

  const stopServerRunStream = useCallback((): void => {
    removeListenersRef.current?.();
    removeListenersRef.current = null;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    serverRunActiveRef.current = false;
    args.setRunStatus('idle');
  }, [args, serverRunActiveRef]);

  const startStream = useCallback((ctx: ServerRunStreamContext) => {
    const { runId, runStartedAt, runtimeNodeById, historyLimit } = ctx;

    removeListenersRef.current?.();
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = streamAiPathRun(runId);
    eventSourceRef.current = eventSource;

    const handleRunEvent = (event: Event): void => {
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
        if (!isTerminalAiPathRunStatus(runStatus)) {
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
        logClientCatch(err, {
          source: 'useAiPathsServerExecution',
          action: 'parseRunEvent',
          runId,
        });
      }
    };

    const handleNodesEvent = (event: Event): void => {
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
          const iteration = asNumber(nodeUpdate.iteration) ?? asNumber(nodeUpdate.attempt);
          const attempt = asNumber(nodeUpdate.attempt);
          const traceId = asString(nodeUpdate.traceId) ?? resolvedRunId;
          const spanId = asString(nodeUpdate.spanId);
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
              traceId,
              ...(spanId ? { spanId } : {}),
              nodeId,
              nodeType,
              nodeTitle: nodeTitle ?? null,
              status,
              iteration: iteration ?? previousNodeHistory.length + 1,
              ...(attempt !== null ? { attempt } : {}),
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
        logClientCatch(err, {
          source: 'useAiPathsServerExecution',
          action: 'parseNodeEvent',
          runId,
        });
      }
    };

    const handleEventsEvent = (event: Event): void => {
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
        logClientCatch(err, {
          source: 'useAiPathsServerExecution',
          action: 'parseEventsEvent',
          runId,
        });
      }
    };

    const handleDoneEvent = (event: Event): void => {
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
        logClientCatch(err, {
          source: 'useAiPathsServerExecution',
          action: 'parseDoneEvent',
          runId,
        });
      }
    };

    const handleErrorEvent = (event: Event): void => {
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
        logClientCatch(err, {
          source: 'useAiPathsServerExecution',
          action: 'parseErrorEvent',
          runId,
        });
      }
    };

    const handleStreamError = (err: Event): void => {
      if (!serverRunActiveRef.current) return;
      if (eventSource.readyState === EventSource.CONNECTING) {
        logClientError(new Error('Server run stream disconnected — reconnecting'), {
          context: {
            source: 'useAiPathsServerExecution',
            action: 'eventSourceOnError',
            level: 'warn',
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

    eventSource.addEventListener('run', handleRunEvent);
    eventSource.addEventListener('nodes', handleNodesEvent);
    eventSource.addEventListener('events', handleEventsEvent);
    eventSource.addEventListener('done', handleDoneEvent);
    eventSource.addEventListener('error', handleErrorEvent);
    eventSource.onerror = handleStreamError;
    removeListenersRef.current = (): void => {
      eventSource.removeEventListener('run', handleRunEvent);
      eventSource.removeEventListener('nodes', handleNodesEvent);
      eventSource.removeEventListener('events', handleEventsEvent);
      eventSource.removeEventListener('done', handleDoneEvent);
      eventSource.removeEventListener('error', handleErrorEvent);
      eventSource.onerror = null;
    };
  }, [args, finalizeRun, serverRunActiveRef]);

  return {
    startStream,
    stopServerRunStream,
  };
}
