import { useCallback } from 'react';
import type {
  AiNode,
  PathConfig,
  PathDebugSnapshot,
  RuntimeState,
  RuntimePortValues,
} from '@/shared/lib/ai-paths';
import {
  PATH_DEBUG_PREFIX,
  TRIGGER_EVENTS,
  appendLocalRun,
  evaluateGraphClient as evaluateGraph,
  evaluateRunPreflight,
  stableStringify,
  GraphExecutionError,
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths';
import { updateAiPathsSetting } from '@/shared/lib/ai-paths/settings-store-client';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  LOCAL_RUN_STEP_CHUNK,
} from '@/shared/contracts/ai-paths-runtime';

import { evaluateLocalExecutionSecurity } from './local-execution-security';
import { 
  buildActivePathConfig, 
  buildDebugSnapshot, 
  buildTriggerContext, 
  createRunId, 
  safeJsonStringify 
} from './utils';

import type { LocalExecutionArgs } from './types';
import {
  buildSimulationOutputsFromContext,
  extractDatabaseRuntimeMetadata,
  hasEntityReference,
  hasSimulationContextProvenance,
  isSimulationCapableFetcher,
  normalizeEntityType,
  readEntityIdFromContext,
  readEntityTypeFromContext,
  resolveSimulationRunBehavior,
  resolveTriggerContextMode,
} from './useAiPathsLocalExecution.helpers';

export function useAiPathsLocalExecutionLogic(args: LocalExecutionArgs) {
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
          runId: args.currentRunIdRef.current ?? outcome.state?.currentRun?.id ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.currentRun?.startedAt ?? null,
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
                strictFlowMode: args.strictFlowMode,
                blockedRunPolicy: args.blockedRunPolicy,
                aiPathsValidation: args.aiPathsValidation,
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
          runId: args.currentRunIdRef.current ?? outcome.state?.currentRun?.id ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.currentRun?.startedAt ?? null,
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
                  strictFlowMode: args.strictFlowMode,
                  blockedRunPolicy: args.blockedRunPolicy,
                  aiPathsValidation: args.aiPathsValidation,
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
          runId: args.currentRunIdRef.current ?? outcome.state?.currentRun?.id ?? null,
          runStartedAt: args.currentRunStartedAtRef.current ?? outcome.state?.currentRun?.startedAt ?? null,
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
                strictFlowMode: args.strictFlowMode,
                blockedRunPolicy: args.blockedRunPolicy,
                aiPathsValidation: args.aiPathsValidation,
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
      const nodeValidationEnabledForBlockedPolicy =
        args.aiPathsValidation?.enabled !== false;
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
          const runStartedAt = args.currentRunStartedAtRef.current ?? state.currentRun?.startedAt ?? new Date().toISOString();
          args.currentRunIdRef.current = runId;
          args.currentRunStartedAtRef.current = runStartedAt;
          const seedHashes = Object.fromEntries(
            Object.entries(state.hashes ?? {}).filter(
              ([, value]) => typeof value === 'string'
            )
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
          const haltRef = { reason: 'completed' as 'completed' | 'step_limit' | 'cancelled' | 'blocked' };
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
              const rawStatus = (nextOutputs)['status'] as string | undefined;
              const normalizedStatus =
                (cached ? 'cached' : args.normalizeNodeStatus(rawStatus)) ?? 'completed';
              const metadata =
                node.type === 'database'
                  ? extractDatabaseRuntimeMetadata(nextOutputs)
                  : null;
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
                  ...(nextOutputs),
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
                      ...((prevOutputs ?? {})),
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
            const blockedCount = args.normalizedNodes.reduce((count: number, node: AiNode): number => {
              const status = nextState.outputs?.[node.id]?.['status'];
              return typeof status === 'string' && status.trim().toLowerCase() === 'blocked'
                ? count + 1
                : count;
            }, 0);
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

  const getConnectedSimulationNodesForTrigger = useCallback(
    (triggerNodeId: string): AiNode[] => {
      const simulationById = new Map<string, AiNode>(
        args.normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'simulation')
          .map((node: AiNode): [string, AiNode] => [node.id, node])
      );
      const connected: AiNode[] = [];
      const added = new Set<string>();
      args.sanitizedEdges.forEach((edge) => {
        if (edge.to !== triggerNodeId || !edge.from) return;
        const toPort = (edge.toPort?.trim() || 'context').toLowerCase();
        if (toPort !== 'context') return;
        const simulationNode = simulationById.get(edge.from);
        if (!simulationNode || added.has(simulationNode.id)) return;
        connected.push(simulationNode);
        added.add(simulationNode.id);
      });
      return connected;
    },
    [args.normalizedNodes, args.sanitizedEdges]
  );

  const getConnectedFetcherNodesForTrigger = useCallback(
    (triggerNodeId: string): AiNode[] => {
      const fetcherById = new Map<string, AiNode>(
        args.normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'fetcher')
          .map((node: AiNode): [string, AiNode] => [node.id, node])
      );
      const connected: AiNode[] = [];
      const added = new Set<string>();
      args.sanitizedEdges.forEach((edge) => {
        if (edge.from !== triggerNodeId || !edge.to) return;
        const fromPort = (edge.fromPort?.trim() || '').toLowerCase();
        const toPort = (edge.toPort?.trim() || '').toLowerCase();
        if (fromPort && fromPort !== 'trigger') return;
        if (toPort && toPort !== 'trigger') return;
        const fetcherNode = fetcherById.get(edge.to);
        if (!fetcherNode || added.has(fetcherNode.id)) return;
        connected.push(fetcherNode);
        added.add(fetcherNode.id);
      });
      return connected;
    },
    [args.normalizedNodes, args.sanitizedEdges]
  );

  const resolveSimulationContextForNode = useCallback(
    async (
      simulationNode: AiNode,
      contextFallback?: Record<string, unknown> | null
    ): Promise<Record<string, unknown> | null> => {
      const configuredEntityId =
        simulationNode.config?.simulation?.entityId?.trim() ||
        simulationNode.config?.simulation?.productId?.trim() ||
        null;
      const configuredEntityType =
        normalizeEntityType(simulationNode.config?.simulation?.entityType) ?? 'product';
      const fallbackEntityId = readEntityIdFromContext(contextFallback);
      const fallbackEntityType = readEntityTypeFromContext(contextFallback);
      const entityId = configuredEntityId ?? fallbackEntityId;
      const entityType = configuredEntityId
        ? configuredEntityType
        : fallbackEntityType ?? configuredEntityType;
      if (!entityId) {
        return null;
      }
      const entity = await args.fetchEntityByType(entityType, entityId);
      if (!entity) {
        args.toast(`No ${entityType} data found for ID ${entityId}.`, {
          variant: 'error',
        });
      }
      return {
        contextSource: 'simulation',
        source: 'simulation',
        simulationNodeId: simulationNode.id,
        simulationNodeTitle: simulationNode.title ?? simulationNode.id,
        entityId,
        entityType,
        ...(entityType === 'product' ? { productId: entityId } : {}),
        ...(entity ? { entity, entityJson: entity } : {}),
        ...(entityType === 'product' && entity ? { product: entity } : {}),
      };
    },
    [args.fetchEntityByType, args.toast]
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
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? 'manual';
    const triggerContextArgs = {
      triggerNode,
      triggerEvent,
      event: event || undefined,
      sessionUser: args.sessionUser,
      activePathId: args.activePathId,
      pathName: args.pathName,
      activeTab: args.activeTab,
      activeTrigger: args.activeTrigger,
    };
    const triggerContextMode = resolveTriggerContextMode(triggerNode);
    const connectedSimulationNodes = getConnectedSimulationNodesForTrigger(triggerNode.id);
    const connectedFetcherNodes = getConnectedFetcherNodesForTrigger(triggerNode.id);
    const hasSimulationFetcherSource = connectedFetcherNodes.some((node: AiNode): boolean =>
      isSimulationCapableFetcher(node)
    );
    const baseTriggerContext = buildTriggerContext(triggerContextArgs);
    const simulationSeedOutputs: Record<string, RuntimePortValues> = {};
    let resolvedSimulationContext: Record<string, unknown> | null = null;
    const allowSimulationContext = triggerContextMode !== 'trigger_only';
    const localSecurityIssues = evaluateLocalExecutionSecurity(args.normalizedNodes);
    if (args.executionMode === 'local' && localSecurityIssues.length > 0) {
      const timestamp = new Date().toISOString();
      const message =
        'Local run blocked: inline credentials detected. Switch execution mode to Server or use connection-based auth.';
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          localExecutionSecurityBlocked: true,
          issueCount: localSecurityIssues.length,
          issues: localSecurityIssues.slice(0, 6),
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message,
        metadata: {
          localExecutionSecurityBlocked: true,
          issueCount: localSecurityIssues.length,
        },
      });
      args.toast(message, { variant: 'error' });
      return;
    }
    const runPreflight = evaluateRunPreflight({
      nodes: args.normalizedNodes,
      edges: args.sanitizedEdges,
      aiPathsValidation: args.aiPathsValidation,
      strictFlowMode: args.strictFlowMode,
      triggerNodeId: triggerNode.id,
      runtimeState: args.runtimeStateRef.current,
      parserSamples: args.parserSamples,
      updaterSamples: args.updaterSamples,
      mode: 'full',
    });
    const validationReport = runPreflight.validationReport;
    const compileReport = runPreflight.compileReport;
    const dependencyReport = runPreflight.dependencyReport;
    const dataContractReport = runPreflight.dataContractReport;
    const nodeValidationEnabled = runPreflight.nodeValidationEnabled;
    if (nodeValidationEnabled && validationReport.blocked) {
      const timestamp = new Date().toISOString();
      const primaryFinding = validationReport.findings[0];
      const blockedMessage = primaryFinding
        ? `Validation blocked run: ${primaryFinding.ruleTitle}.`
        : `Validation blocked run: score ${validationReport.score} below threshold ${validationReport.blockThreshold}.`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message: blockedMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          validation: {
            score: validationReport.score,
            policy: validationReport.policy,
            warnThreshold: validationReport.warnThreshold,
            blockThreshold: validationReport.blockThreshold,
            failedRules: validationReport.failedRules,
            findings: validationReport.findings.slice(0, 5).map((finding) => ({
              ruleId: finding.ruleId,
              ruleTitle: finding.ruleTitle,
              severity: finding.severity,
              message: finding.message,
            })),
          },
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message: blockedMessage,
        metadata: {
          validationBlocked: true,
          validationScore: validationReport.score,
          validationBlockThreshold: validationReport.blockThreshold,
          failedRules: validationReport.failedRules,
        },
      });
      args.toast(
        `Validation blocked run (score ${validationReport.score}). Fix validation findings in Path Settings.`,
        { variant: 'error' },
      );
      return;
    }
    if (nodeValidationEnabled && validationReport.shouldWarn) {
      const warningMessage = `Validation warning: score ${validationReport.score} with ${validationReport.failedRules} failed rule(s).`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_warning',
        level: 'warn',
        timestamp: new Date().toISOString(),
        message: warningMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          validation: {
            score: validationReport.score,
            policy: validationReport.policy,
            warnThreshold: validationReport.warnThreshold,
            blockThreshold: validationReport.blockThreshold,
            failedRules: validationReport.failedRules,
          },
        },
      });
      args.toast(warningMessage, { variant: 'warning' });
    }

    if (
      args.onCanonicalEdgesDetected &&
      stableStringify(args.edges) !== stableStringify(args.sanitizedEdges)
    ) {
      args.onCanonicalEdgesDetected(args.sanitizedEdges);
    }

    if (nodeValidationEnabled && !compileReport.ok) {
      const timestamp = new Date().toISOString();
      const primaryError = compileReport.findings.find(
        (finding): boolean => finding.severity === 'error'
      );
      const blockedMessage =
        primaryError?.message ??
        `Graph compile blocked run: ${compileReport.errors} issue(s) require fixes.`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message: blockedMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          compile: {
            errors: compileReport.errors,
            warnings: compileReport.warnings,
            findings: compileReport.findings,
          },
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message: blockedMessage,
        metadata: {
          graphCompileBlocked: true,
          graphCompileErrors: compileReport.errors,
        },
      });
      args.toast(blockedMessage, { variant: 'error' });
      return;
    }

    if (compileReport.warnings > 0) {
      const timestamp = new Date().toISOString();
      const warningMessage = `Graph compile reported ${compileReport.warnings} warning(s).`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_warning',
        level: 'warn',
        timestamp,
        message: warningMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          compile: {
            errors: compileReport.errors,
            warnings: compileReport.warnings,
            findings: compileReport.findings,
          },
        },
      });
      args.toast(warningMessage, { variant: 'warning' });
    }

    if (
      nodeValidationEnabled &&
      args.strictFlowMode &&
      dependencyReport &&
      dependencyReport.errors > 0
    ) {
      const timestamp = new Date().toISOString();
      const blockedMessage = `Strict flow blocked run: ${dependencyReport.errors} dependency error(s) detected.`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message: blockedMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          strictFlowMode: true,
          dependencyErrors: dependencyReport.errors,
          dependencyWarnings: dependencyReport.warnings,
          blockedRiskIds: dependencyReport.risks
            .filter((risk): boolean => risk.severity === 'error')
            .map((risk) => risk.id),
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message: blockedMessage,
        metadata: {
          strictFlowMode: true,
          dependencyErrors: dependencyReport.errors,
        },
      });
      args.toast(
        'Strict flow blocked run. Fix Dependency Inspector errors in Path Settings.',
        { variant: 'error' },
      );
      return;
    }

    if (nodeValidationEnabled && dataContractReport.errors > 0) {
      const timestamp = new Date().toISOString();
      const firstIssue = dataContractReport.issues.find(
        (issue) => issue.severity === 'error'
      );
      const blockedMessage =
        firstIssue?.message ??
        `Data contract blocked run: ${dataContractReport.errors} issue(s) detected.`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message: blockedMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          dataContract: {
            errors: dataContractReport.errors,
            warnings: dataContractReport.warnings,
            issues: dataContractReport.issues.slice(0, 10),
          },
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message: blockedMessage,
        metadata: {
          dataContractBlocked: true,
          dataContractErrors: dataContractReport.errors,
        },
      });
      args.toast(blockedMessage, { variant: 'error' });
      return;
    }

    if (
      dataContractReport.warnings > 0 ||
      (!nodeValidationEnabled &&
        (compileReport.errors > 0 ||
          (dependencyReport?.errors ?? 0) > 0 ||
          dataContractReport.errors > 0))
    ) {
      const timestamp = new Date().toISOString();
      const warningMessage = !nodeValidationEnabled
        ? `Node Validation disabled: proceeding with compile/dependency/data-contract findings (compile errors ${compileReport.errors}, dependency errors ${dependencyReport?.errors ?? 0}, data-contract errors ${dataContractReport.errors}).`
        : `Data contract preflight reported ${dataContractReport.warnings} warning(s).`;
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_warning',
        level: 'warn',
        timestamp,
        message: warningMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          compile: {
            errors: compileReport.errors,
            warnings: compileReport.warnings,
          },
          dependency: dependencyReport
            ? {
              errors: dependencyReport.errors,
              warnings: dependencyReport.warnings,
            }
            : undefined,
          dataContract: {
            errors: dataContractReport.errors,
            warnings: dataContractReport.warnings,
            issues: dataContractReport.issues.slice(0, 10),
          },
        },
      });
      args.toast(warningMessage, { variant: 'warning' });
    }

    if (allowSimulationContext && connectedSimulationNodes.length > 0) {
      for (const simulationNode of connectedSimulationNodes) {
        const runBehavior = resolveSimulationRunBehavior(simulationNode);
        const hasExplicitContext = hasEntityReference(contextOverride ?? null);
        const shouldResolve =
          runBehavior === 'before_connected_trigger' ||
          (runBehavior === 'manual_only' && hasExplicitContext);
        if (!shouldResolve) continue;
        const simulationContext = await resolveSimulationContextForNode(
          simulationNode,
          runBehavior === 'manual_only' ? contextOverride ?? null : null
        );
        if (!simulationContext) continue;
        simulationSeedOutputs[simulationNode.id] = buildSimulationOutputsFromContext(
          simulationContext
        );
        resolvedSimulationContext = {
          ...(resolvedSimulationContext || {}),
          ...(simulationContext || {}),
        };
      }
    }

    const triggerContext = {
      ...baseTriggerContext,
      ...(allowSimulationContext ? resolvedSimulationContext ?? {} : {}),
      ...(contextOverride ?? {}),
    };

    const simulationSatisfiedFromOverride = hasSimulationContextProvenance(
      contextOverride ?? null
    );
    const simulationContextSatisfied =
      Boolean(resolvedSimulationContext) ||
      simulationSatisfiedFromOverride ||
      hasSimulationFetcherSource;
    if (triggerContextMode === 'simulation_required' && !simulationContextSatisfied) {
      const timestamp = new Date().toISOString();
      const blockedMessage =
        'Trigger requires Simulation context. Connect Trigger -> Fetcher with simulated source mode, or set connected Simulation nodes to "Auto-run before connected Trigger".';
      args.appendRuntimeEvent({
        source: 'local',
        kind: 'run_blocked',
        level: 'warn',
        timestamp,
        message: blockedMessage,
        nodeId: triggerNode.id,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        metadata: {
          triggerContextMode,
          connectedSimulationNodeIds: connectedSimulationNodes.map((node) => node.id),
          connectedFetcherNodeIds: connectedFetcherNodes.map((node) => node.id),
          hasSimulationFetcherSource,
          hasSimulationContextOverride: simulationSatisfiedFromOverride,
        },
      });
      args.setNodeStatus({
        nodeId: triggerNode.id,
        status: 'blocked',
        source: 'local',
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        level: 'warn',
        message: blockedMessage,
        metadata: {
          triggerContextMode,
          connectedFetcherNodeIds: connectedFetcherNodes.map((node) => node.id),
          hasSimulationFetcherSource,
          hasSimulationContextOverride: simulationSatisfiedFromOverride,
        },
      });
      args.toast(blockedMessage, { variant: 'warning' });
      return;
    }

    if (args.serverRunActiveRef.current) {
      args.stopServerRunStream();
    }
    if (args.executionMode === 'server') {
      if (mode === 'step') {
        args.toast('Step mode is only available in Local execution.', { variant: 'info' });
        return;
      }
      if (args.runInFlightRef.current) {
        // Server mode should always be able to enqueue; abort stale local execution state.
        if (args.abortControllerRef.current && !args.abortControllerRef.current.signal.aborted) {
          args.abortControllerRef.current.abort();
        }
        args.runInFlightRef.current = false;
        args.pauseRequestedRef.current = false;
        args.setRunStatus('idle');
        args.toast('Canceled in-progress local run and switched to server execution.', {
          variant: 'warning',
        });
      }
      await args.runServerStream(triggerNode, triggerEvent, triggerContext);
      return;
    }
    if (args.runInFlightRef.current) {
      if (args.runMode === 'automatic' && mode === 'run') {
        args.queuedRunsRef.current.push({
          triggerNodeId: triggerNode.id,
          pathId: args.activePathId ?? null,
          contextOverride: triggerContext,
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
    args.triggerContextRef.current = triggerContext;
    if (args.executionMode === 'local') {
      const previousState = args.runtimeStateRef.current;
      const nextOutputs: Record<string, RuntimePortValues> = {};
      Object.entries(simulationSeedOutputs).forEach(([nodeId, output]) => {
        nextOutputs[nodeId] = {
          ...(nextOutputs[nodeId] ?? {}),
          ...output,
        };
      });
      const nextState: RuntimeState = {
        ...previousState,
        runId,
        runStartedAt: startedAt,
        inputs: {},
        outputs: nextOutputs,
        history: {},
        hashes: {},
        hashTimestamps: {},
        nodeOutputs: {},
      };
      args.runtimeStateRef.current = nextState;
      args.setRuntimeState(nextState);
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

    if (args.runMode === 'automatic' && args.queuedRunsRef.current.length > 0) {
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
          args.toast('Run queued skipped (trigger node missing).', { variant: 'info' });
          return;
        }
        void runGraphForTrigger(nextTrigger, undefined, next.contextOverride ?? undefined);
      }
    }
  }, [
    args,
    runLocalLoop,
    finalizeLocalRunOutcome,
    getConnectedSimulationNodesForTrigger,
    getConnectedFetcherNodesForTrigger,
    resolveSimulationContextForNode,
  ]);

  const handleLocalRun = useCallback((triggerNode: AiNode, event?: React.MouseEvent, contextOverride?: Record<string, unknown>): void => {
    void runGraphForTrigger(triggerNode, event, contextOverride, { mode: 'run' });
  }, [runGraphForTrigger]);

  const handleLocalStep = useCallback((triggerNode: AiNode, event?: React.MouseEvent, contextOverride?: Record<string, unknown>): void => {
    void runGraphForTrigger(triggerNode, event, contextOverride, { mode: 'step' });
  }, [runGraphForTrigger]);

  const handleCancelLocalRun = useCallback((): void => {
    if (args.abortControllerRef.current) {
      args.abortControllerRef.current.abort();
    }
    args.pauseRequestedRef.current = false;
    args.runLoopActiveRef.current = false;
    args.runInFlightRef.current = false;
    args.setRunStatus('idle');
  }, [args]);

  const handleClearLocalRun = useCallback((): void => {
    handleCancelLocalRun();
    args.resetRuntimeNodeStatuses({});
    const clearedState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      runId: null,
      runStartedAt: null,
      inputs: {},
      outputs: {},
      history: {},
      hashes: {},
      hashTimestamps: {},
    };
    args.setRuntimeState(clearedState);
    args.runtimeStateRef.current = clearedState;
    args.currentRunIdRef.current = null;
    args.currentRunStartedAtRef.current = null;
    args.currentRunStartedAtMsRef.current = 0;
    args.triggerContextRef.current = null;
    args.lastTriggerNodeIdRef.current = null;
    args.lastTriggerEventRef.current = null;
  }, [args, handleCancelLocalRun]);

  const handleSyncSimulationOutputs = useCallback((simulationNode: AiNode, context: Record<string, unknown>): void => {
    const simulationOutputs = buildSimulationOutputsFromContext(context);
    args.setRuntimeState((prev: RuntimeState): RuntimeState => {
      const next: RuntimeState = {
        ...prev,
        outputs: {
          ...(prev.outputs ?? {}),
          [simulationNode.id]: {
            ...(prev.outputs?.[simulationNode.id] ?? {}),
            ...simulationOutputs,
            status: 'completed',
          },
        },
      };
      args.runtimeStateRef.current = next;
      return next;
    });
    args.setNodeStatus({
      nodeId: simulationNode.id,
      status: 'completed',
      source: 'local',
      nodeType: simulationNode.type,
      nodeTitle: simulationNode.title ?? null,
      kind: 'node_finished',
      level: 'info',
      message: `Node ${simulationNode.title ?? simulationNode.id} synced with live context.`,
    });
  }, [args]);

  const handleTriggerConnectedSimulation = useCallback(
    async (triggerNode: AiNode, contextFallback?: Record<string, unknown> | null): Promise<void> => {
      const connectedSimulationNodes = getConnectedSimulationNodesForTrigger(triggerNode.id);
      if (connectedSimulationNodes.length === 0) return;
      for (const simulationNode of connectedSimulationNodes) {
        const context = await resolveSimulationContextForNode(simulationNode, contextFallback);
        if (context) {
          handleSyncSimulationOutputs(simulationNode, context);
        }
      }
    },
    [getConnectedSimulationNodesForTrigger, handleSyncSimulationOutputs, resolveSimulationContextForNode]
  );

  return {
    handleLocalRun,
    handleLocalStep,
    handleCancelLocalRun,
    handleClearLocalRun,
    handleSyncSimulationOutputs,
    handleTriggerConnectedSimulation,
    runLocalLoop,
    runGraphForTrigger,
  };
}
