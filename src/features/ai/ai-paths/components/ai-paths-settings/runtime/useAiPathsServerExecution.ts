'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import { useGraphActions } from '@/features/ai/ai-paths/context/GraphContext';
import type { AiNode, AiPathRunRecord } from '@/shared/contracts/ai-paths';
import { mergeEnqueuedAiPathRunForCache } from '@/shared/lib/ai-paths/api';
import {
  invalidateAiPathQueue,
  invalidateAiPathRuns,
  notifyAiPathRunEnqueued,
  optimisticallyInsertAiPathRunInQueueCache,
} from '@/shared/lib/query-invalidation';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { prepareEnqueuePayload, performEnqueue } from './server-execution/enqueue-logic';
import { useServerRunStream } from './server-execution/useServerRunStream';
import {
  resolveRunAt,
  resolveRunStartedAt,
  buildActivePathConfig,
} from './utils';

import type { ServerExecutionArgs, ServerRunFinalizeOptions } from './server-execution/types';

export function useAiPathsServerExecution(args: ServerExecutionArgs) {
  const queryClient = useQueryClient();
  const { setPathConfigs } = useGraphActions();
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const serverRunActiveRef = useRef(false);

  const finalizeRun = useCallback(
    (
      terminalStatus: 'completed' | 'failed' | 'canceled',
      options?: ServerRunFinalizeOptions
    ): void => {
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
      
      stopServerRunStream();
      
      if (args.currentRunIdRef) {
        args.currentRunIdRef.current = null;
      }
      if (args.currentRunStartedAtRef) {
        args.currentRunStartedAtRef.current = null;
      }
      args.setCurrentRunId?.(null);
      void invalidateAiPathRuns(queryClient);
      
      if (terminalStatus === 'completed' && args.currentRunIdRef?.current) {
        args.openRunDetail?.(args.currentRunIdRef.current);
      }
    },
    [args, queryClient, setPathConfigs]
  );

  const { startStream, stopServerRunStream } = useServerRunStream(args, serverRunActiveRef, finalizeRun);

  const runServerStream = useCallback(
    async (
      triggerNode: AiNode,
      triggerEvent: string,
      triggerContext: Record<string, unknown>
    ): Promise<void> => {
      if (!args.activePathId) {
        const message = 'Cannot run path: missing path id in runtime state. Reload AI Paths and try again.';
        args.appendRuntimeEvent({ source: 'server', kind: 'run_failed', level: 'error', message });
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

      const enqueueInfo = prepareEnqueuePayload(args, triggerNode.id, triggerEvent, triggerContext);
      if ('error' in enqueueInfo) {
        const message = `Cannot run path: ${enqueueInfo.error}.`;
        args.appendRuntimeEvent({ source: 'server', kind: 'run_failed', level: 'error', message });
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'failed',
          source: 'server',
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_failed',
          level: 'error',
          message: `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
          metadata: { error: message, issues: enqueueInfo.issues },
        });
        args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
        args.setRunStatus('idle');
        args.toast(message, { variant: 'error' });
        stopServerRunStream();
        return;
      }

      try {
        const result = await performEnqueue(
          args,
          {
            ...enqueueInfo.payload,
            ...(contextRegistry ? { contextRegistry } : {}),
          },
          enqueueInfo.requestId
        );
        if ('error' in result && result.error === 'enqueue_failed') {
          const { metadata, result: enqueueResult } = result;
          const enqueueError =
            enqueueResult && typeof enqueueResult.error === 'string'
              ? enqueueResult.error
              : 'Failed to enqueue server run.';
          const blocked =
            enqueueError.includes('Validation blocked run') ||
            enqueueError.includes('Graph compile failed');
          
          args.appendRuntimeEvent({ source: 'server', kind: 'run_failed', level: blocked ? 'warn' : 'error', message: enqueueError });
          args.setNodeStatus({
            nodeId: triggerNode.id,
            status: blocked ? 'blocked' : 'failed',
            source: 'server',
            nodeType: triggerNode.type,
            nodeTitle: triggerNode.title ?? null,
            kind: blocked ? 'node_status' : 'node_failed',
            level: blocked ? 'warn' : 'error',
            message: blocked ? `Node ${triggerNode.title ?? triggerNode.id} blocked before enqueue.` : `Node ${triggerNode.title ?? triggerNode.id} failed to enqueue.`,
            metadata: { error: enqueueError, ...metadata },
          });
          args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
          args.setRunStatus('idle');
          args.toast(enqueueError, { variant: blocked ? 'warning' : 'error' });
          stopServerRunStream();
          return;
        }

        const { runId, runRecord, enqueueRecovered } = result;
        if (!runId) {
          const message = 'Server run was enqueued without a run id.';
          args.appendRuntimeEvent({ source: 'server', kind: 'run_failed', level: 'error', message });
          args.settleTransientNodeStatuses('failed', {}, { settleQueued: true });
          args.setRunStatus('idle');
          args.toast(message, { variant: 'error' });
          stopServerRunStream();
          return;
        }

        if (enqueueRecovered) {
          args.appendRuntimeEvent({ source: 'server', kind: 'run_warning', level: 'warn', message: 'Recovered queued server run after losing the enqueue response.' });
        }

        const queuedRunFallback: AiPathRunRecord = {
          id: runId,
          pathId: args.activePathId,
          pathName: args.pathName ?? null,
          status: 'queued',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          entityId: enqueueInfo.entityId,
          entityType: enqueueInfo.entityType,
        };
        const queuedRunForCache = mergeEnqueuedAiPathRunForCache({
          fallbackRun: queuedRunFallback,
          runId,
          runRecord,
        });
        optimisticallyInsertAiPathRunInQueueCache(queryClient, queuedRunForCache);
        void invalidateAiPathQueue(queryClient);
        void invalidateAiPathRuns(queryClient);
        notifyAiPathRunEnqueued(runId, { entityId: enqueueInfo.entityId, entityType: enqueueInfo.entityType });

        const runStartedAt = (runRecord ? resolveRunStartedAt(runRecord, args.runtimeStateRef.current) : null) ?? new Date().toISOString();
        if (args.currentRunIdRef) args.currentRunIdRef.current = runId;
        if (args.currentRunStartedAtRef) args.currentRunStartedAtRef.current = runStartedAt;
        args.setCurrentRunId?.(runId);

        args.appendRuntimeEvent({ source: 'server', kind: 'run_started', level: 'info', message: 'Server run queued.' });
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

        startStream({
          runId,
          runStartedAt,
          triggerNode,
          runtimeNodeById: new Map(args.normalizedNodes.map((n) => [n.id, n])),
          historyLimit: Math.max(1, Math.trunc(typeof args.historyRetentionPasses === 'number' ? args.historyRetentionPasses : 20)),
        });

      } catch (error) {
        logClientCatch(error, {
          source: 'useAiPathsServerExecution',
          action: 'runServerStream',
          pathId: args.activePathId,
          triggerNodeId: triggerNode.id,
        });
        finalizeRun('failed', { message: 'Failed to initiate server run.' });
      }
    },
    [
      args,
      contextRegistry,
      queryClient,
      setPathConfigs,
      stopServerRunStream,
      startStream,
      finalizeRun,
    ]
  );

  return {
    serverRunActiveRef,
    runServerStream,
    stopServerRunStream,
  };
}
