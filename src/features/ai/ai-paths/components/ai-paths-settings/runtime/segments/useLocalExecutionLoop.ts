import { useCallback } from 'react';
import type {
  AiNode,
  RuntimeState,
  RuntimePortValues,
} from '@/shared/lib/ai-paths';
import {
  evaluateGraphClient as evaluateGraph,
  GraphExecutionError,
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths';
import { LOCAL_RUN_STEP_CHUNK } from '@/shared/contracts/ai-paths-runtime';

import {
  createRunId,
} from '../utils';

import type { LocalExecutionArgs } from '../types';
import {
  extractDatabaseRuntimeMetadata,
} from '../useAiPathsLocalExecution.helpers';

export function useLocalExecutionLoop(args: LocalExecutionArgs) {
  const runLocalLoop = useCallback(
    async (
      mode: 'run' | 'step'
    ): Promise<{
      status: 'completed' | 'paused' | 'canceled' | 'error';
      error?: unknown;
      state: RuntimeState;
    }> => {
      if (args.runLoopActiveRef.current) {
        return { status: 'paused', state: args.runtimeStateRef.current };
      }
      args.runLoopActiveRef.current = true;
      const stepLimit = mode === 'step' ? 1 : LOCAL_RUN_STEP_CHUNK;
      const nodeValidationEnabledForBlockedPolicy = args.aiPathsValidation?.enabled !== false;
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
          const runId = args.currentRunIdRef.current ?? state.currentRun?.id ?? createRunId();
          const runStartedAt =
            args.currentRunStartedAtRef.current ??
            state.currentRun?.startedAt ??
            new Date().toISOString();
          args.currentRunIdRef.current = runId;
          args.currentRunStartedAtRef.current = runStartedAt;
          const seedHashes = Object.fromEntries(
            Object.entries(state.hashes ?? {}).filter(([, value]) => typeof value === 'string')
          ) as Record<string, string>;
          const seedHashTimestamps = Object.fromEntries(
            Object.entries(state.hashTimestamps ?? {}).filter(
              ([, value]) => typeof value === 'number' && Number.isFinite(value)
            )
          ) as Record<string, number>;
          if (!args.currentRunStartedAtMsRef.current) {
            const parsed = Date.parse(runStartedAt);
            args.currentRunStartedAtMsRef.current = Number.isNaN(parsed) ? Date.now() : parsed;
          }
          const haltRef = {
            reason: 'completed' as 'completed' | 'step_limit' | 'cancelled' | 'blocked',
          };
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
            strictFlowMode: args.strictFlowMode,
            deferPoll: true,
            recordHistory: true,
            historyLimit: args.historyRetentionPasses,
            seedOutputs: state.outputs,
            seedHashes: Object.keys(seedHashes).length > 0 ? seedHashes : undefined,
            seedHashTimestamps:
              Object.keys(seedHashTimestamps).length > 0 ? seedHashTimestamps : undefined,
            seedHistory:
              state.history && typeof state.history === 'object' && !Array.isArray(state.history)
                ? (state.history as Record<string, never[]>)
                : undefined,
            seedRunId: state.currentRun?.id ?? runId,
            seedRunStartedAt: state.currentRun?.startedAt ?? runStartedAt,
            onNodeStart: ({
              runId: callbackRunId,
              runStartedAt: callbackRunStartedAt,
              node,
              nodeInputs,
              iteration,
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              iteration: number;
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
                const prevInputs = prev.inputs ?? {};
                const prevOutputs = prev.outputs ?? {};
                const next: RuntimeState = {
                  ...prev,
                  runId: callbackRunId,
                  runStartedAt: callbackRunStartedAt,
                  inputs: {
                    ...prevInputs,
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...prevOutputs,
                    [node.id]: {
                      ...(prevOutputs[node.id] ?? {}),
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
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              nextOutputs: RuntimePortValues;
              cached?: boolean;
              iteration: number;
            }) => {
              const rawStatus = nextOutputs['status'] as string | undefined;
              const normalizedStatus =
                (cached ? 'cached' : args.normalizeNodeStatus(rawStatus)) ?? 'completed';
              const metadata =
                node.type === 'database' ? extractDatabaseRuntimeMetadata(nextOutputs) : null;
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
                ...(metadata ? { metadata } : {}),
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const nextOutput = {
                  ...(prev.outputs?.[node.id] ?? {}),
                  ...nextOutputs,
                  status: normalizedStatus,
                } as RuntimePortValues;
                const next: RuntimeState = {
                  ...prev,
                  runId: callbackRunId,
                  runStartedAt: callbackRunStartedAt,
                  inputs: {
                    ...(prev.inputs ?? {}),
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...(prev.outputs ?? {}),
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
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              prevOutputs: RuntimePortValues | null;
              error: unknown;
              iteration: number;
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
                    ...(prev.inputs ?? {}),
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...(prev.outputs ?? {}),
                    [node.id]: {
                      ...(prevOutputs ?? {}),
                      status: 'failed',
                      error: message,
                    } as RuntimePortValues,
                  },
                };
                args.runtimeStateRef.current = next;
                return next;
              });
            },
            fetchEntityByType: args.fetchEntityByType,
            reportAiPathsError: args.reportAiPathsError,
            toast: (message: unknown, options?: unknown): void => {
              args.toast(
                typeof message === 'string' ? message : String(message ?? ''),
                options as Parameters<typeof args.toast>[1]
              );
            },
            control: {
              mode,
              stepLimit,
              signal: args.abortControllerRef.current?.signal,
              onHalt: (payload: {
                reason: 'completed' | 'step_limit' | 'cancelled' | 'blocked';
                iteration?: number;
              }) => {
                haltRef.reason = payload.reason;
              },
            },
          });
          state = nextState;
          args.runtimeStateRef.current = nextState;
          args.setRuntimeState(nextState);
          if (haltRef.reason === 'blocked') {
            const failOnBlocked =
              nodeValidationEnabledForBlockedPolicy &&
              args.blockedRunPolicy !== 'complete_with_warning';
            const firstBlockedNode = args.normalizedNodes.find((node: AiNode): boolean => {
              const status = nextState.outputs?.[node.id]?.['status'];
              return typeof status === 'string' && status.trim().toLowerCase() === 'blocked';
            });
            const firstBlockedMessage =
              firstBlockedNode &&
              typeof nextState.outputs?.[firstBlockedNode.id]?.['message'] === 'string'
                ? String(nextState.outputs[firstBlockedNode.id]?.['message']).trim()
                : '';
            const blockedCount = args.normalizedNodes.reduce(
              (count: number, node: AiNode): number => {
                const status = nextState.outputs?.[node.id]?.['status'];
                return typeof status === 'string' && status.trim().toLowerCase() === 'blocked'
                  ? count + 1
                  : count;
              },
              0
            );
            args.appendRuntimeEvent({
              source: 'local',
              kind: 'run_blocked',
              level: failOnBlocked ? 'error' : 'warn',
              runId,
              runStartedAt,
              timestamp: new Date().toISOString(),
              message:
                firstBlockedMessage ||
                (blockedCount > 0
                  ? `Run blocked: ${blockedCount} node${blockedCount === 1 ? '' : 's'} waiting for required inputs.`
                  : 'Run blocked: one or more nodes are waiting for required inputs.'),
            });
            if (failOnBlocked) {
              capturedError = new Error(
                firstBlockedMessage ||
                  (blockedCount > 0
                    ? `Run blocked: ${blockedCount} node${blockedCount === 1 ? '' : 's'} waiting for required inputs.`
                    : 'Run blocked: one or more nodes are waiting for required inputs.')
              );
              outcome = 'error';
            }
            break;
          }
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

  return { runLocalLoop };
}
