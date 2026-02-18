'use client';

import { useCallback } from 'react';

import type {
  AiNode,
  PathConfig,
  PathDebugSnapshot,
  RuntimeState,
  RuntimePortValues,
} from '@/features/ai/ai-paths/lib';
import {
  PATH_DEBUG_PREFIX,
  TRIGGER_EVENTS,
  appendLocalRun,
  evaluateGraph,
  GraphExecutionError,
  GraphExecutionCancelled,
} from '@/features/ai/ai-paths/lib';
import { updateAiPathsSetting } from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability';

import {
  LOCAL_RUN_STEP_CHUNK,
  type LocalExecutionArgs,
} from './types';
import { 
  buildActivePathConfig, 
  buildDebugSnapshot, 
  buildTriggerContext, 
  createRunId, 
  safeJsonStringify 
} from './utils';

export function useAiPathsLocalExecution(args: LocalExecutionArgs) {
  const persistDebugSnapshot = useCallback(
    async (pathId: string | null, runAt: string, state: RuntimeState): Promise<void> => {
      if (!pathId) return;
      const snapshot = buildDebugSnapshot({ pathId, runAt, state, nodes: args.normalizedNodes });
      if (!snapshot) return;
      const payload = safeJsonStringify(snapshot);
      if (!payload) return;
      try {
        await updateAiPathsSetting(`${PATH_DEBUG_PREFIX}${pathId}`, payload);
        args.setPathDebugSnapshots((prev: Record<string, PathDebugSnapshot>) => ({
          ...prev,
          [pathId]: snapshot,
        }));
      } catch (error) {
        logClientError(error, { context: { source: 'useAiPathsLocalExecution', action: 'persistDebugSnapshot', pathId } });
      }
    },
    [args]
  );

  const finalizeLocalRunOutcome = useCallback(
    (
      outcome: { status: 'completed' | 'paused' | 'canceled' | 'error'; error?: unknown; state: RuntimeState },
      meta: { startedAt: string; startedAtMs: number; triggerEvent: string | null; triggerContext: Record<string, unknown> | null }
    ): void => {
      const finishedAt = new Date().toISOString();
      if (outcome.status === 'completed') {
        args.settleTransientNodeStatuses('completed');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_completed',
          level: 'info',
          runId: args.currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message: 'Run completed.',
        });
        args.setLastRunAt(finishedAt);
        void persistDebugSnapshot(args.activePathId ?? null, finishedAt, outcome.state);
        if (args.activePathId) {
          args.setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [args.activePathId!]: {
              ...(prev[args.activePathId!] ?? buildActivePathConfig({
                activePathId: args.activePathId,
                pathName: args.pathName,
                pathDescription: args.pathDescription,
                activeTrigger: args.activeTrigger,
                executionMode: args.executionMode,
                runMode: args.runMode,
                nodes: args.normalizedNodes,
                edges: args.sanitizedEdges,
                updatedAt: finishedAt,
                parserSamples: args.parserSamples,
                updaterSamples: args.updaterSamples,
                runtimeState: outcome.state,
                lastRunAt: finishedAt,
                runCount: 1,
              })),
              runtimeState: outcome.state,
              lastRunAt: finishedAt,
              runCount: Math.max(
                1,
                Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1),
              ),
            },
          }));
        }
        const entityId =
          typeof meta.triggerContext?.['entityId'] === 'string'
            ? meta.triggerContext['entityId']
            : null;
        const entityType =
          typeof meta.triggerContext?.['entityType'] === 'string'
            ? meta.triggerContext['entityType']
            : null;
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: args.activeTrigger ?? null,
          entityId,
          entityType,
          status: 'success',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: args.normalizedNodes.length,
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'error') {
        args.settleTransientNodeStatuses('failed');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_failed',
          level: 'error',
          runId: args.currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message:
            outcome.error instanceof Error ? `Run failed: ${outcome.error.message}` : 'Run failed.',
        });
        if (outcome.state) {
          args.setLastRunAt(finishedAt);
          if (args.activePathId) {
            args.setPathConfigs((prev: Record<string, PathConfig>) => ({
              ...prev,
              [args.activePathId!]: {
                ...(prev[args.activePathId!] ?? buildActivePathConfig({
                  activePathId: args.activePathId,
                  pathName: args.pathName,
                  pathDescription: args.pathDescription,
                  activeTrigger: args.activeTrigger,
                  executionMode: args.executionMode,
                  runMode: args.runMode,
                  nodes: args.normalizedNodes,
                  edges: args.sanitizedEdges,
                  updatedAt: finishedAt,
                  parserSamples: args.parserSamples,
                  updaterSamples: args.updaterSamples,
                  runtimeState: outcome.state,
                  lastRunAt: finishedAt,
                  runCount: 1,
                })),
                runtimeState: outcome.state,
                lastRunAt: finishedAt,
                runCount: Math.max(
                  1,
                  Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1),
                ),
              },
            }));
          }
        }
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: args.activeTrigger ?? null,
          status: 'error',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: args.normalizedNodes.length,
          error: outcome.error instanceof Error ? outcome.error.message : 'Local run failed',
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'canceled') {
        args.settleTransientNodeStatuses('canceled');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_canceled',
          level: 'info',
          runId: args.currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message: 'Run cancelled.',
        });
        args.toast('Run cancelled.', { variant: 'info' });
        args.setLastRunAt(finishedAt);
        if (args.activePathId) {
          args.setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [args.activePathId!]: {
              ...(prev[args.activePathId!] ?? buildActivePathConfig({
                activePathId: args.activePathId,
                pathName: args.pathName,
                pathDescription: args.pathDescription,
                activeTrigger: args.activeTrigger,
                executionMode: args.executionMode,
                runMode: args.runMode,
                nodes: args.normalizedNodes,
                edges: args.sanitizedEdges,
                updatedAt: finishedAt,
                parserSamples: args.parserSamples,
                updaterSamples: args.updaterSamples,
                runtimeState: outcome.state,
                lastRunAt: finishedAt,
                runCount: 1,
              })),
              runtimeState: outcome.state,
              lastRunAt: finishedAt,
              runCount: Math.max(
                1,
                Math.trunc((prev[args.activePathId!]?.runCount ?? 0) + 1),
              ),
            },
          }));
        }
        void appendLocalRun({
          pathId: args.activePathId ?? null,
          pathName: args.pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: args.activeTrigger ?? null,
          status: 'error',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: args.normalizedNodes.length,
          error: 'Run cancelled',
          source: 'ai_paths_ui',
        });
      }
    },
    [args, persistDebugSnapshot]
  );

  const runLocalLoop = useCallback(
    async (
      mode: 'run' | 'step'
    ): Promise<{ status: 'completed' | 'paused' | 'canceled' | 'error'; error?: unknown; state: RuntimeState }> => {
      if (args.runLoopActiveRef.current) {
        return { status: 'paused', state: args.runtimeStateRef.current };
      }
      args.runLoopActiveRef.current = true;
      const stepLimit = mode === 'step' ? 1 : LOCAL_RUN_STEP_CHUNK;
      let outcome: 'completed' | 'paused' | 'canceled' | 'error' = 'completed';
      let capturedError: unknown = undefined;
      try {
        if (!args.abortControllerRef.current || args.abortControllerRef.current.signal.aborted) {
          args.abortControllerRef.current = new AbortController();
        }
        if (mode === 'run') {
          args.pauseRequestedRef.current = false;
        }
        args.setRunStatus(mode === 'step' ? 'stepping' : 'running');
        let state = args.runtimeStateRef.current;
        while (true) {
          const runId = args.currentRunIdRef.current ?? state.runId ?? createRunId();
          const runStartedAt = args.currentRunStartedAtRef.current ?? state.runStartedAt ?? new Date().toISOString();
          args.currentRunIdRef.current = runId;
          args.currentRunStartedAtRef.current = runStartedAt;
          if (!args.currentRunStartedAtMsRef.current) {
            const parsed = Date.parse(runStartedAt);
            args.currentRunStartedAtMsRef.current = Number.isNaN(parsed) ? Date.now() : parsed;
          }
          const haltRef = { reason: 'completed' as 'completed' | 'step_limit' | 'cancelled' };
          const nextState = await evaluateGraph({
            nodes: args.normalizedNodes,
            edges: args.sanitizedEdges,
            activePathId: args.activePathId,
            activePathName: args.pathName,
            runId,
            runStartedAt,
            triggerNodeId: args.lastTriggerNodeIdRef.current ?? undefined,
            triggerEvent: args.lastTriggerEventRef.current ?? undefined,
            triggerContext: args.triggerContextRef.current,
            deferPoll: true,
            recordHistory: true,
            historyLimit: args.historyRetentionPasses,
            seedOutputs: state.outputs,
            seedHashes: state.hashes ?? undefined,
            seedHashTimestamps: state.hashTimestamps ?? undefined,
            seedHistory: state.history ?? undefined,
            seedRunId: state.runId ?? runId,
            seedRunStartedAt: state.runStartedAt ?? runStartedAt,
            onNodeStart: ({
              runId: callbackRunId,
              runStartedAt: callbackRunStartedAt,
              node,
              nodeInputs,
              iteration,
            }) => {
              args.setNodeStatus({
                nodeId: node.id,
                status: 'running',
                source: 'local',
                runId: callbackRunId,
                runStartedAt: callbackRunStartedAt,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: 'node_started',
                level: 'info',
                message: `Node ${node.title ?? node.id} started.`,
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const next: RuntimeState = {
                  ...prev,
                  runId: callbackRunId,
                  runStartedAt: callbackRunStartedAt,
                  inputs: {
                    ...prev.inputs,
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...prev.outputs,
                    [node.id]: {
                      ...((prev.outputs[node.id] ?? {}) as Record<string, unknown>),
                      status: 'running',
                    },
                  },
                };
                args.runtimeStateRef.current = next;
                return next;
              });
            },
            onNodeFinish: ({
              runId: callbackRunId,
              runStartedAt: callbackRunStartedAt,
              node,
              nodeInputs,
              nextOutputs,
              cached,
              iteration,
            }) => {
              const rawStatus = (nextOutputs as Record<string, unknown>)?.['status'];
              const normalizedStatus =
                args.normalizeNodeStatus(rawStatus) ?? (cached ? 'cached' : 'completed');
              args.setNodeStatus({
                nodeId: node.id,
                status: normalizedStatus,
                source: 'local',
                runId: callbackRunId,
                runStartedAt: callbackRunStartedAt,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: normalizedStatus === 'failed' ? 'node_failed' : 'node_finished',
                level: normalizedStatus === 'failed' ? 'error' : 'info',
                message:
                  normalizedStatus === 'cached'
                    ? `Node ${node.title ?? node.id} reused cached outputs.`
                    : `Node ${node.title ?? node.id} ${args.formatStatusLabel(normalizedStatus)}.`,
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const nextOutput = {
                  ...((prev.outputs[node.id] ?? {}) as Record<string, unknown>),
                  ...(nextOutputs as Record<string, unknown>),
                  status: normalizedStatus,
                } as RuntimePortValues;
                const next: RuntimeState = {
                  ...prev,
                  runId: callbackRunId,
                  runStartedAt: callbackRunStartedAt,
                  inputs: {
                    ...prev.inputs,
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...prev.outputs,
                    [node.id]: nextOutput,
                  },
                };
                args.runtimeStateRef.current = next;
                return next;
              });
            },
            onNodeError: ({
              runId: callbackRunId,
              runStartedAt: callbackRunStartedAt,
              node,
              nodeInputs,
              prevOutputs,
              error,
              iteration,
            }) => {
              const message = error instanceof Error ? error.message : String(error);
              args.setNodeStatus({
                nodeId: node.id,
                status: 'failed',
                source: 'local',
                runId: callbackRunId,
                runStartedAt: callbackRunStartedAt,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: 'node_failed',
                level: 'error',
                message: `Node ${node.title ?? node.id} failed: ${message}`,
                metadata: { error: message },
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const next: RuntimeState = {
                  ...prev,
                  runId: callbackRunId,
                  runStartedAt: callbackRunStartedAt,
                  inputs: {
                    ...prev.inputs,
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...prev.outputs,
                    [node.id]: {
                      ...((prevOutputs ?? {}) as Record<string, unknown>),
                      status: 'failed',
                      error: message,
                    },
                  },
                };
                args.runtimeStateRef.current = next;
                return next;
              });
            },
            fetchEntityByType: args.fetchEntityByType,
            reportAiPathsError: args.reportAiPathsError,
            toast: args.toast,
            control: {
              mode,
              stepLimit,
              signal: args.abortControllerRef.current?.signal,
              onHalt: (payload) => {
                haltRef.reason = payload.reason;
              },
            },
          });
          state = nextState;
          args.runtimeStateRef.current = nextState;
          args.setRuntimeState(nextState);
          const iteratorPending = args.hasPendingIteratorAdvance(nextState);
          if (haltRef.reason === 'step_limit') {
            if (mode === 'step' || args.pauseRequestedRef.current) {
              outcome = 'paused';
              break;
            }
            continue;
          }
          if (iteratorPending) {
            if (mode === 'step' || args.pauseRequestedRef.current) {
              outcome = 'paused';
              break;
            }
            continue;
          }
          outcome = 'completed';
          break;
        }
      } catch (error) {
        capturedError = error;
        if (error instanceof GraphExecutionCancelled) {
          const errorState = error.state ?? args.runtimeStateRef.current;
          args.runtimeStateRef.current = errorState;
          args.setRuntimeState(errorState);
          outcome = 'canceled';
        } else {
          const errorState =
            error instanceof GraphExecutionError
              ? error.state
              : typeof error === 'object' && error && 'state' in error
                ? (error as { state?: RuntimeState }).state
                : undefined;
          if (errorState) {
            args.runtimeStateRef.current = errorState;
            args.setRuntimeState(errorState);
          }
          outcome = 'error';
        }
      } finally {
        args.runLoopActiveRef.current = false;
      }
      return { status: outcome, error: capturedError, state: args.runtimeStateRef.current };
    },
    [args]
  );

  const runGraphForTrigger = useCallback(async (
    triggerNode: AiNode,
    event?: React.MouseEvent,
    contextOverride?: Record<string, unknown>,
    options?: { mode?: 'run' | 'step' }
  ): Promise<void> => {
    const mode = options?.mode ?? 'run';
    if (!args.isPathActive) {
      args.toast('This path is deactivated. Activate it to run.', { variant: 'info' });
      return;
    }
    if (args.serverRunActiveRef.current) {
      args.stopServerRunStream();
    }
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? 'manual';
    if (args.runInFlightRef.current) {
      if (args.runMode === 'queue' && mode === 'run') {
        const triggerContextArgs = {
          triggerNode,
          triggerEvent,
          event: event || undefined,
          sessionUser: args.sessionUser,
          activePathId: args.activePathId,
          pathName: args.pathName,
          activeTab: args.activeTab,
          activeTrigger: args.activeTrigger
        };
        const queuedContext = {
          ...buildTriggerContext(triggerContextArgs),
          ...(args.pendingSimulationContextRef.current ?? {}),
          ...(contextOverride ?? {}),
        };
        args.pendingSimulationContextRef.current = null;
        args.queuedRunsRef.current.push({
          triggerNodeId: triggerNode.id,
          pathId: args.activePathId ?? null,
          contextOverride: queuedContext,
          queuedAt: new Date().toISOString(),
        });
        const position = args.queuedRunsRef.current.length;
        args.setNodeStatus({
          nodeId: triggerNode.id,
          status: 'queued',
          source: 'local',
          runId: args.currentRunIdRef.current ?? null,
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_status',
          level: 'info',
          message: `Node ${triggerNode.title ?? triggerNode.id} queued (${position}).`,
        });
        args.toast(`Run queued${position > 1 ? ` (${position} in queue)` : ''}.`, { variant: 'info' });
        return;
      }
      args.toast('A run is already in progress.', { variant: 'info' });
      return;
    }
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const runId = createRunId();
    args.runInFlightRef.current = true;
    args.resetRuntimeNodeStatuses({});
    args.appendRuntimeEvent({
      source: 'local',
      kind: 'run_started',
      level: 'info',
      runId,
      runStartedAt: startedAt,
      timestamp: startedAt,
      message: mode === 'step' ? 'Step run started.' : 'Run started.',
    });
    args.currentRunIdRef.current = runId;
    args.currentRunStartedAtRef.current = startedAt;
    args.currentRunStartedAtMsRef.current = startedAtMs;
    args.lastTriggerNodeIdRef.current = triggerNode.id;
    args.lastTriggerEventRef.current = triggerEvent ?? null;
    args.setNodeStatus({
      nodeId: triggerNode.id,
      status: 'running',
      source: 'local',
      runId,
      runStartedAt: startedAt,
      nodeType: triggerNode.type,
      nodeTitle: triggerNode.title ?? null,
      kind: 'node_started',
      level: 'info',
      message: `Node ${triggerNode.title ?? triggerNode.id} started.`,
    });
    args.abortControllerRef.current = new AbortController();
    const simulationContext = args.pendingSimulationContextRef.current ?? null;
    const triggerContextArgs = {
      triggerNode,
      triggerEvent,
      event: event || undefined,
      sessionUser: args.sessionUser,
      activePathId: args.activePathId,
      pathName: args.pathName,
      activeTab: args.activeTab,
      activeTrigger: args.activeTrigger
    };
    const triggerContext = {
      ...buildTriggerContext(triggerContextArgs),
      ...(simulationContext ?? {}),
      ...(contextOverride ?? {}),
    };
    args.triggerContextRef.current = triggerContext;
    args.pendingSimulationContextRef.current = null;
    const immediateEntityId =
      typeof triggerContext['entityId'] === 'string'
        ? (triggerContext['entityId'])
        : typeof triggerContext['productId'] === 'string'
          ? (triggerContext['productId'])
          : null;
    const immediateEntityType =
      typeof triggerContext['entityType'] === 'string'
        ? (triggerContext['entityType'])
        : null;
    const immediateContext = {
      ...triggerContext,
      ...(immediateEntityId ? { entityId: immediateEntityId } : {}),
      ...(immediateEntityType ? { entityType: immediateEntityType } : {}),
      trigger: triggerEvent,
      pathId: args.activePathId ?? null,
      source: triggerContext['source'] ?? null,
    };
    const immediateOutputs: RuntimePortValues = {
      trigger: true,
      triggerName: triggerEvent,
      meta: {
        firedAt: startedAt,
        trigger: triggerEvent,
        pathId: args.activePathId ?? null,
        entityId: immediateEntityId,
        entityType: immediateEntityType,
        ui: triggerContext['ui'] ?? null,
        location: triggerContext['location'] ?? null,
        source: triggerContext['source'] ?? null,
        user: triggerContext['user'] ?? null,
        event: triggerContext['event'] ?? null,
        extras: triggerContext['extras'] ?? null,
      },
      context: immediateContext,
      ...(immediateEntityId ? { entityId: immediateEntityId } : {}),
      ...(immediateEntityType ? { entityType: immediateEntityType } : {}),
    };
    const immediateInputs = simulationContext ?? contextOverride ?? null;
    if (args.executionMode === 'local') {
      args.setRuntimeState((prev: RuntimeState): RuntimeState => {
        const seededInputs: Record<string, RuntimePortValues> = immediateInputs
          ? {
            ...prev.inputs,
            [triggerNode.id]: {
              ...(prev.inputs[triggerNode.id] ?? {}),
              context: immediateInputs,
            },
          }
          : { ...prev.inputs };
        const nextOutputs = {
          ...prev.outputs,
          [triggerNode.id]: immediateOutputs,
        };
        const nextInputs = args.seedImmediateDownstreamInputs(
          seededInputs,
          nextOutputs,
          triggerNode.id
        );
        const next: RuntimeState = {
          ...prev,
          runId,
          runStartedAt: startedAt,
          inputs: nextInputs,
          outputs: nextOutputs,
        };
        args.runtimeStateRef.current = next;
        return next;
      });
    }

    const outcome = await runLocalLoop(mode);
    if (outcome.status === 'paused') {
      args.setRunStatus('paused');
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_paused',
        level: 'info',
        runId,
        runStartedAt: startedAt,
        message: 'Run paused.',
      });
      return;
    }

    args.runInFlightRef.current = false;
    args.setRunStatus('idle');
    args.abortControllerRef.current = null;
    args.pauseRequestedRef.current = false;

    finalizeLocalRunOutcome(outcome, {
      startedAt,
      startedAtMs,
      triggerEvent: triggerEvent ?? null,
      triggerContext,
    });

    if (args.runMode === 'queue' && args.queuedRunsRef.current.length > 0) {
      const next = args.queuedRunsRef.current.shift();
      if (next) {
        if (next.pathId !== (args.activePathId ?? null)) {
          args.toast('Queued run skipped (path changed).', { variant: 'info' });
          return;
        }
        const nextTrigger = args.normalizedNodes.find(
          (node: AiNode): boolean => node.id === next.triggerNodeId
        );
        if (!nextTrigger) {
          args.toast('Queued run skipped (trigger node missing).', { variant: 'info' });
          return;
        }
        void runGraphForTrigger(nextTrigger, undefined, next.contextOverride ?? undefined);
      }
    }
  }, [args, createRunId, runLocalLoop, finalizeLocalRunOutcome]);

  return {
    runLocalLoop,
    runGraphForTrigger,
    finalizeLocalRunOutcome
  };
}
