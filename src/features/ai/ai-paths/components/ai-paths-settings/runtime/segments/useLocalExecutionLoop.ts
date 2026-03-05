import { useCallback } from 'react';
import type { AiNode, RuntimeState, RuntimePortValues } from '@/shared/lib/ai-paths';
import {
  evaluateGraphClient as evaluateGraph,
  GraphExecutionError,
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths';
import {
  resolveAiPathsRuntimeValidationMiddleware,
} from '@/shared/lib/ai-paths/core/validation-engine/runtime-middleware';

import {
  createRunId,
  mergeRuntimeNodeOutputsForStatus,
  resolveRuntimeNodeDisplayStatus,
} from '../utils';

import type { LocalExecutionArgs } from '../types';
import { extractDatabaseRuntimeMetadata } from '../useAiPathsLocalExecution.helpers';

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeRuntimeKernelMode = (value: unknown): 'auto' | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  return normalized === 'auto' || normalized === 'legacy_only' ? 'auto' : undefined;
};

const parseRuntimeKernelListValue = ({
  value,
  normalizeToken,
}: {
  value: unknown;
  normalizeToken: (value: string) => string;
}): string[] | undefined => {
  if (Array.isArray(value)) {
    const normalized = Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry: string): string => normalizeToken(entry))
          .filter(Boolean)
      )
    );
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) {
        const normalized = Array.from(
          new Set(
            parsed
              .filter((entry): entry is string => typeof entry === 'string')
              .map((entry: string): string => normalizeToken(entry))
              .filter(Boolean)
          )
        );
        return normalized.length > 0 ? normalized : undefined;
      }
    } catch {
      // Fall through to tokenized parsing.
    }
  }
  const normalized = Array.from(
    new Set(
      trimmed
        .split(/[,\n]/g)
        .map((entry: string): string => normalizeToken(entry))
        .filter(Boolean)
    )
  );
  return normalized.length > 0 ? normalized : undefined;
};

const parseRuntimeKernelPilotNodeTypes = (value: unknown): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: (token: string): string => token.trim().toLowerCase().replace(/\s+/g, '_'),
  });

const parseRuntimeKernelResolverIds = (value: unknown): string[] | undefined =>
  parseRuntimeKernelListValue({
    value,
    normalizeToken: (token: string): string => token.trim(),
  });

const parseRuntimeKernelStrictNativeRegistry = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on')
    return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off')
    return false;
  return undefined;
};

export function useLocalExecutionLoop(args: LocalExecutionArgs) {
  const runtimeKernelConfig = toRecord(args.runtimeKernelConfig);
  const runtimeKernelMode = normalizeRuntimeKernelMode(runtimeKernelConfig?.['mode']);
  const runtimeKernelPilotNodeTypes = parseRuntimeKernelPilotNodeTypes(
    runtimeKernelConfig?.['pilotNodeTypes']
  );
  const runtimeKernelCodeObjectResolverIds = parseRuntimeKernelResolverIds(
    runtimeKernelConfig?.['codeObjectResolverIds'] ?? runtimeKernelConfig?.['resolverIds']
  );
  const runtimeKernelStrictNativeRegistry = parseRuntimeKernelStrictNativeRegistry(
    runtimeKernelConfig?.['strictNativeRegistry'] ?? runtimeKernelConfig?.['strictCodeObjectRegistry']
  );
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
        const runtimeValidationMiddleware = resolveAiPathsRuntimeValidationMiddleware({
          runtimeValidationEnabled: args.aiPathsValidation?.enabled !== false,
          runtimeValidationConfig: args.aiPathsValidation,
          nodes: args.normalizedNodes,
          edges: args.sanitizedEdges,
          maxIssuesPerDecision: 5,
        });
        const toRuntimeResolutionMetadata = (input: {
          runtimeStrategy?: unknown;
          runtimeResolutionSource?: unknown;
          runtimeCodeObjectId?: unknown;
        }): Record<string, unknown> => {
          const runtimeStrategy =
            input.runtimeStrategy === 'legacy_adapter' || input.runtimeStrategy === 'code_object_v3'
              ? input.runtimeStrategy
              : null;
          const runtimeResolutionSource =
            input.runtimeResolutionSource === 'override' ||
            input.runtimeResolutionSource === 'registry' ||
            input.runtimeResolutionSource === 'missing'
              ? input.runtimeResolutionSource
              : null;
          const runtimeCodeObjectId =
            input.runtimeCodeObjectId === null
              ? null
              : typeof input.runtimeCodeObjectId === 'string' &&
                  input.runtimeCodeObjectId.trim().length > 0
                ? input.runtimeCodeObjectId.trim()
                : undefined;
          return {
            ...(runtimeStrategy ? { runtimeStrategy } : {}),
            ...(runtimeResolutionSource ? { runtimeResolutionSource } : {}),
            ...(runtimeCodeObjectId !== undefined ? { runtimeCodeObjectId } : {}),
          };
        };
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
            reason: 'completed' as 'completed' | 'blocked' | 'max_iterations' | 'failed',
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
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              iteration: number;
              runtimeStrategy?: 'legacy_adapter' | 'code_object_v3';
              runtimeResolutionSource?: 'override' | 'registry' | 'missing';
              runtimeCodeObjectId?: string | null;
            }) => {
              const runtimeResolutionMetadata = toRuntimeResolutionMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              });
              args.setNodeStatus({
                nodeId: node.id,
                status: 'running',
                source: 'local',
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: 'node_started',
                level: 'info',
                message: `Node ${node.title ?? node.id} started.`,
                ...(Object.keys(runtimeResolutionMetadata).length > 0
                  ? { metadata: runtimeResolutionMetadata }
                  : {}),
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const prevInputs = prev.inputs ?? {};
                const prevOutputs = prev.outputs ?? {};
                const next: RuntimeState = {
                  ...prev,
                  currentRun: {
                    ...(prev.currentRun ?? {}),
                    id: callbackRunId,
                    status: 'running',
                    startedAt: callbackRunStartedAt,
                  },
                  inputs: {
                    ...prevInputs,
                    [node.id]: nodeInputs,
                  },
                  outputs: {
                    ...prevOutputs,
                    [node.id]: mergeRuntimeNodeOutputsForStatus({
                      previous: prevOutputs[node.id],
                      next: {},
                      status: 'running',
                    }),
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
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              nextOutputs: RuntimePortValues;
              cached?: boolean;
              iteration: number;
              runtimeStrategy?: 'legacy_adapter' | 'code_object_v3';
              runtimeResolutionSource?: 'override' | 'registry' | 'missing';
              runtimeCodeObjectId?: string | null;
            }) => {
              const rawStatus = nextOutputs['status'] as string | undefined;
              const normalizedStatus =
                (cached ? 'cached' : args.normalizeNodeStatus(rawStatus)) ?? 'completed';
              const displayStatus = resolveRuntimeNodeDisplayStatus({
                status: normalizedStatus,
                outputs: nextOutputs,
              });
              if (!displayStatus) return;
              const metadata =
                node.type === 'database' ? extractDatabaseRuntimeMetadata(nextOutputs) : null;
              const runtimeResolutionMetadata = toRuntimeResolutionMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              });
              const statusMetadata = {
                ...(metadata ? metadata : {}),
                ...runtimeResolutionMetadata,
              };
              args.setNodeStatus({
                nodeId: node.id,
                status: displayStatus,
                source: 'local',
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: displayStatus === 'failed' ? 'node_failed' : 'node_finished',
                level: displayStatus === 'failed' ? 'error' : 'info',
                message:
                  displayStatus === 'cached'
                    ? `Node ${node.title ?? node.id} reused cached outputs.`
                    : `Node ${node.title ?? node.id} ${args.formatStatusLabel(displayStatus)}.`,
                ...(Object.keys(statusMetadata).length > 0
                  ? { metadata: statusMetadata }
                  : {}),
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const nextOutput = mergeRuntimeNodeOutputsForStatus({
                  previous: prev.outputs?.[node.id],
                  next: nextOutputs,
                  status: displayStatus,
                });
                const next: RuntimeState = {
                  ...prev,
                  currentRun: {
                    ...(prev.currentRun ?? {}),
                    id: callbackRunId,
                    status: 'running',
                    startedAt: callbackRunStartedAt,
                  },
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
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            }: {
              runId: string;
              runStartedAt: string;
              node: AiNode;
              nodeInputs: RuntimePortValues;
              prevOutputs: RuntimePortValues | null;
              error: unknown;
              iteration: number;
              runtimeStrategy?: 'legacy_adapter' | 'code_object_v3';
              runtimeResolutionSource?: 'override' | 'registry' | 'missing';
              runtimeCodeObjectId?: string | null;
            }) => {
              const message = error instanceof Error ? error.message : String(error);
              const runtimeResolutionMetadata = toRuntimeResolutionMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              });
              args.setNodeStatus({
                nodeId: node.id,
                status: 'failed',
                source: 'local',
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: 'node_failed',
                level: 'error',
                message: `Node ${node.title ?? node.id} failed: ${message}`,
                metadata: {
                  error: message,
                  ...runtimeResolutionMetadata,
                },
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const nextOutput = mergeRuntimeNodeOutputsForStatus({
                  previous: prev.outputs?.[node.id],
                  next: {
                    ...(prevOutputs ?? {}),
                    error: message,
                  },
                  status: 'failed',
                });
                const next: RuntimeState = {
                  ...prev,
                  currentRun: {
                    ...(prev.currentRun ?? {}),
                    id: callbackRunId,
                    status: 'running',
                    startedAt: callbackRunStartedAt,
                  },
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
            onNodeBlocked: ({
              node,
              reason,
              status,
              waitingOnPorts,
              waitingOnDetails,
              message,
              runId: callbackRunId,
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            }: {
              node: AiNode;
              reason: 'missing_inputs' | 'flow_control' | 'validation' | 'error';
              status?: 'blocked' | 'waiting_callback';
              waitingOnPorts?: string[];
              waitingOnDetails?: Array<Record<string, unknown>>;
              message?: string;
              runId: string;
              runtimeStrategy?: 'legacy_adapter' | 'code_object_v3';
              runtimeResolutionSource?: 'override' | 'registry' | 'missing';
              runtimeCodeObjectId?: string | null;
            }) => {
              const nodeStatus = resolveRuntimeNodeDisplayStatus({
                status: status === 'waiting_callback' ? 'waiting_callback' : 'blocked',
                outputs: {
                  blockedReason: reason,
                  ...(waitingOnPorts ? { waitingOnPorts } : {}),
                },
              });
              if (!nodeStatus) return;
              const runtimeResolutionMetadata = toRuntimeResolutionMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              });
              args.setNodeStatus({
                nodeId: node.id,
                status: nodeStatus,
                source: 'local',
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                kind: 'node_status',
                level: nodeStatus === 'waiting_callback' ? 'info' : 'warn',
                message:
                  message ??
                  (nodeStatus === 'waiting_callback'
                    ? `Node ${node.title ?? node.id} waiting for upstream signal.`
                    : `Node ${node.title ?? node.id} blocked by missing inputs.`),
                metadata: {
                  reason,
                  ...(waitingOnPorts ? { waitingOnPorts } : {}),
                  ...(waitingOnDetails ? { waitingOnDetails } : {}),
                  ...runtimeResolutionMetadata,
                },
              });
              args.setRuntimeState((prev: RuntimeState): RuntimeState => {
                const nextOutput = mergeRuntimeNodeOutputsForStatus({
                  previous: prev.outputs?.[node.id],
                  next: {
                    status: nodeStatus,
                    skipReason: reason,
                    blockedReason: reason,
                    ...(message ? { message } : {}),
                    ...(waitingOnPorts ? { waitingOnPorts } : {}),
                    ...(waitingOnDetails ? { waitingOnDetails } : {}),
                  },
                  status: nodeStatus,
                });
                const next: RuntimeState = {
                  ...prev,
                  currentRun: {
                    ...(prev.currentRun ?? {}),
                    id: callbackRunId,
                    status: 'running',
                    startedAt: prev.currentRun?.startedAt ?? runStartedAt,
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
            fetchEntityByType: args.fetchEntityByType,
            reportAiPathsError: args.reportAiPathsError,
            validationMiddleware: runtimeValidationMiddleware,
            onRuntimeValidation: ({
              node,
              stage,
              decision,
              message,
              iteration,
              issues,
              runtimeStrategy,
              runtimeResolutionSource,
              runtimeCodeObjectId,
            }) => {
              const runtimeResolutionMetadata = toRuntimeResolutionMetadata({
                runtimeStrategy,
                runtimeResolutionSource,
                runtimeCodeObjectId,
              });
              args.appendRuntimeEvent({
                source: 'local',
                kind:
                  decision === 'block'
                    ? 'runtime_validation_blocked'
                    : 'runtime_validation_warn',
                level: decision === 'block' ? 'error' : 'warn',
                timestamp: new Date().toISOString(),
                message,
                ...(node?.id ? { nodeId: node.id } : {}),
                ...(node?.type ? { nodeType: node.type } : {}),
                ...(node?.title ? { nodeTitle: node.title } : {}),
                ...(typeof iteration === 'number' ? { iteration } : {}),
                metadata: {
                  stage,
                  decision,
                  issueCount: issues.length,
                  issues: issues.slice(0, 3),
                  ...runtimeResolutionMetadata,
                },
              });
            },
            abortSignal: args.abortControllerRef.current?.signal,
            toast: (message: unknown, options?: unknown): void => {
              args.toast(
                typeof message === 'string' ? message : String(message ?? ''),
                options as Parameters<typeof args.toast>[1]
              );
            },
            onHalt: (payload: {
              reason: 'blocked' | 'max_iterations' | 'completed' | 'failed';
              iteration?: number;
            }) => {
              haltRef.reason = payload.reason;
            },
            ...(runtimeKernelMode ? { runtimeKernelMode } : {}),
            ...(runtimeKernelPilotNodeTypes ? { runtimeKernelPilotNodeTypes } : {}),
            ...(runtimeKernelCodeObjectResolverIds ? { runtimeKernelCodeObjectResolverIds } : {}),
            ...(runtimeKernelStrictNativeRegistry !== undefined
              ? { runtimeKernelStrictNativeRegistry }
              : {}),
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
          if (haltRef.reason === 'max_iterations') {
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
    [
      args,
      runtimeKernelCodeObjectResolverIds,
      runtimeKernelMode,
      runtimeKernelPilotNodeTypes,
      runtimeKernelStrictNativeRegistry,
    ]
  );

  return { runLocalLoop };
}
