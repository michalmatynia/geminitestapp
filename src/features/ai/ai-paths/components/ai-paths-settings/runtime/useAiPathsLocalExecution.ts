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
  compileGraph,
  evaluateAiPathsValidationPreflight,
  evaluateGraph,
  inspectPathDependencies,
  GraphExecutionError,
  GraphExecutionCancelled,
} from '@/features/ai/ai-paths/lib';
import { updateAiPathsSetting } from '@/features/ai/ai-paths/lib/settings-store-client';
import { logClientError } from '@/features/observability';
import {
  LOCAL_RUN_STEP_CHUNK,
} from '@/shared/contracts/ai-paths-runtime';

import { 
  buildActivePathConfig, 
  buildDebugSnapshot, 
  buildTriggerContext, 
  createRunId, 
  safeJsonStringify 
} from './utils';

import type { LocalExecutionArgs } from './types';

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const extractDatabaseRuntimeMetadata = (
  nextOutputs: RuntimePortValues
): Record<string, unknown> | null => {
  const bundle = nextOutputs['bundle'];
  if (!isPlainRecord(bundle)) return null;

  const collection =
    typeof bundle['collection'] === 'string' && bundle['collection'].trim().length > 0
      ? bundle['collection']
      : null;
  const requestedProvider =
    typeof bundle['requestedProvider'] === 'string' &&
    bundle['requestedProvider'].trim().length > 0
      ? bundle['requestedProvider']
      : null;
  const resolvedProvider =
    typeof bundle['resolvedProvider'] === 'string' &&
    bundle['resolvedProvider'].trim().length > 0
      ? bundle['resolvedProvider']
      : typeof bundle['provider'] === 'string' &&
          bundle['provider'].trim().length > 0
        ? bundle['provider']
        : null;
  const providerFallback = isPlainRecord(bundle['providerFallback'])
    ? bundle['providerFallback']
    : null;
  const count =
    typeof bundle['count'] === 'number' && Number.isFinite(bundle['count'])
      ? bundle['count']
      : null;

  const databaseMeta: Record<string, unknown> = {};
  if (collection) {
    databaseMeta['collection'] = collection;
  }
  if (requestedProvider) {
    databaseMeta['requestedProvider'] = requestedProvider;
  }
  if (resolvedProvider) {
    databaseMeta['resolvedProvider'] = resolvedProvider;
  }
  if (providerFallback) {
    databaseMeta['providerFallback'] = providerFallback;
  }
  if (count !== null) {
    databaseMeta['count'] = count;
  }

  if (Object.keys(databaseMeta).length === 0) return null;
  return { database: databaseMeta };
};

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
            }) => {
              const rawStatus = (nextOutputs)?.['status'];
              const normalizedStatus =
                args.normalizeNodeStatus(rawStatus) ?? (cached ? 'cached' : 'completed');
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
                      ...((prevOutputs ?? {})),
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
    const validationReport = evaluateAiPathsValidationPreflight({
      nodes: args.normalizedNodes,
      edges: args.sanitizedEdges,
      config: args.aiPathsValidation,
    });
    if (validationReport.enabled && validationReport.blocked) {
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
    if (validationReport.enabled && validationReport.shouldWarn) {
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

    const compileReport = compileGraph(args.normalizedNodes, args.edges);
    if (!compileReport.ok) {
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
      args.toast(
        `Graph compile blocked run (${compileReport.errors} error${compileReport.errors === 1 ? '' : 's'}).`,
        { variant: 'error' }
      );
      return;
    }

    if (args.strictFlowMode) {
      const dependencyReport = inspectPathDependencies(args.normalizedNodes, args.sanitizedEdges);
      if (dependencyReport.errors > 0) {
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
    }
    if (args.serverRunActiveRef.current) {
      args.stopServerRunStream();
    }
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id ?? 'manual';
    if (args.runInFlightRef.current) {
      if (args.runMode === 'automatic' && mode === 'run') {
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
            ...(prev.inputs ?? {}),
            [triggerNode.id]: {
              ...(prev.inputs?.[triggerNode.id] ?? {}),
              context: immediateInputs,
            },
          }
          : { ...(prev.inputs ?? {}) };
        const nextOutputs = {
          ...(prev.outputs ?? {}),
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
