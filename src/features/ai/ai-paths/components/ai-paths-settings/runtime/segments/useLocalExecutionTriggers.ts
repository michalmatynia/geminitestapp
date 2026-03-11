import { useCallback, useRef } from 'react';

import type { AiNode, RuntimeState, RuntimePortValues } from '@/shared/lib/ai-paths';
import { TRIGGER_EVENTS, evaluateRunPreflight, stableStringify } from '@/shared/lib/ai-paths';

import { evaluateLocalExecutionSecurity } from '../local-execution-security';
import {
  buildSimulationOutputsFromContext,
  hasEntityReference,
  normalizeEntityType,
  readEntityIdFromContext,
  readEntityTypeFromContext,
  resolveFetcherSourceMode,
} from '../useAiPathsLocalExecution.helpers';
import { buildTriggerContext, createRunId, mergeRuntimeNodeOutputsForStatus } from '../utils';

import type { LocalExecutionArgs } from '../types';

export function useLocalExecutionTriggers(
  args: LocalExecutionArgs,
  loop: {
    runLocalLoop: (mode: 'run' | 'step') => Promise<{
      status: 'completed' | 'paused' | 'canceled' | 'error';
      error?: unknown;
      state: RuntimeState;
    }>;
  },
  outcome: {
    finalizeLocalRunOutcome: (
      outcome: {
        status: 'completed' | 'paused' | 'canceled' | 'error';
        error?: unknown;
        state: RuntimeState;
      },
      meta: {
        startedAt: string;
        startedAtMs: number;
        triggerEvent: string | null;
        triggerContext: Record<string, unknown> | null;
      }
    ) => void;
  }
) {
  // Stable refs — callbacks read the latest values without needing them in deps.
  const argsRef = useRef(args);
  argsRef.current = args;
  const loopRef = useRef(loop);
  loopRef.current = loop;
  const outcomeRef = useRef(outcome);
  outcomeRef.current = outcome;
  const getConnectedSimulationNodesForTrigger = useCallback(
    (triggerNodeId: string): AiNode[] => {
      const { normalizedNodes, sanitizedEdges } = argsRef.current;
      const simulationById = new Map<string, AiNode>(
        normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'simulation')
          .map((node: AiNode): [string, AiNode] => [node.id, node])
      );
      const connected: AiNode[] = [];
      const added = new Set<string>();
      sanitizedEdges.forEach((edge) => {
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
    []
  );

  const getConnectedFetcherNodesForTrigger = useCallback(
    (triggerNodeId: string): AiNode[] => {
      const { normalizedNodes, sanitizedEdges } = argsRef.current;
      const fetcherById = new Map<string, AiNode>(
        normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'fetcher')
          .map((node: AiNode): [string, AiNode] => [node.id, node])
      );
      const connected: AiNode[] = [];
      const added = new Set<string>();
      sanitizedEdges.forEach((edge) => {
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
    []
  );

  const resolveSimulationContextForNode = useCallback(
    async (
      simulationNode: AiNode,
      contextFallback?: Record<string, unknown> | null
    ): Promise<Record<string, unknown> | null> => {
      const args = argsRef.current;
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
        : (fallbackEntityType ?? configuredEntityType);
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
    []
  );

  const resolveConnectedSimulationBridgeForTrigger = useCallback(
    async (
      triggerNode: AiNode,
      contextFallback?: Record<string, unknown> | null
    ): Promise<{
      contextOverride: Record<string, unknown> | null;
      simulationOutputs: Record<string, RuntimePortValues>;
    }> => {
      const connectedSimulationNodes = getConnectedSimulationNodesForTrigger(triggerNode.id);
      let contextOverride = contextFallback ? { ...contextFallback } : null;
      const simulationOutputs: Record<string, RuntimePortValues> = {};

      for (const simulationNode of connectedSimulationNodes) {
        const context = await resolveSimulationContextForNode(
          simulationNode,
          contextOverride ?? contextFallback ?? null
        );
        if (!context) continue;
        contextOverride = {
          ...(contextOverride ?? {}),
          ...context,
        };
        simulationOutputs[simulationNode.id] = buildSimulationOutputsFromContext(context);
      }

      return {
        contextOverride,
        simulationOutputs,
      };
    },
    [getConnectedSimulationNodesForTrigger, resolveSimulationContextForNode]
  );

  const runGraphForTrigger = useCallback(
    async (
      triggerNode: AiNode,
      event?: React.MouseEvent,
      contextOverride?: Record<string, unknown>,
      options?: { mode?: 'run' | 'step' }
    ): Promise<void> => {
      const args = argsRef.current;
      const loop = loopRef.current;
      const outcome = outcomeRef.current;
      const mode = options?.mode ?? 'run';
      const triggerDisplayName = triggerNode.title ?? triggerNode.id;
      const shouldAnnounceLaunch = mode === 'run' && event !== undefined;
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
      const baseTriggerContext = buildTriggerContext(triggerContextArgs);
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
      const {
        contextOverride: resolvedContextOverride,
        simulationOutputs: simulationSeedOutputs,
      } = await resolveConnectedSimulationBridgeForTrigger(triggerNode, contextOverride ?? null);
      const preflightRuntimeState =
        Object.keys(simulationSeedOutputs).length > 0
          ? {
              ...args.runtimeStateRef.current,
              outputs: {
                ...(args.runtimeStateRef.current.outputs ?? {}),
                ...simulationSeedOutputs,
              },
            }
          : args.runtimeStateRef.current;
      const runPreflight = evaluateRunPreflight({
        nodes: args.normalizedNodes,
        edges: args.sanitizedEdges,
        aiPathsValidation: args.aiPathsValidation,
        strictFlowMode: args.strictFlowMode,
        triggerNodeId: triggerNode.id,
        runtimeState: preflightRuntimeState,
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
          { variant: 'error' }
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
        args.toast('Strict flow blocked run. Fix Dependency Inspector errors in Path Settings.', {
          variant: 'error',
        });
        return;
      }

      if (nodeValidationEnabled && dataContractReport.errors > 0) {
        const timestamp = new Date().toISOString();
        const firstIssue = dataContractReport.issues.find((issue) => issue.severity === 'error');
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

      const triggerContext = {
        ...baseTriggerContext,
        ...(resolvedContextOverride ?? {}),
      };
      const connectedFetcherNodes = getConnectedFetcherNodesForTrigger(triggerNode.id);
      const requiresLiveEntityContext = connectedFetcherNodes.some(
        (fetcherNode: AiNode): boolean => resolveFetcherSourceMode(fetcherNode) === 'live_context'
      );
      if (requiresLiveEntityContext && !hasEntityReference(triggerContext)) {
        const timestamp = new Date().toISOString();
        const fetcherTitles = connectedFetcherNodes
          .filter(
            (fetcherNode: AiNode): boolean =>
              resolveFetcherSourceMode(fetcherNode) === 'live_context'
          )
          .map((fetcherNode: AiNode): string => fetcherNode.title ?? fetcherNode.id);
        const blockedMessage =
          'Canvas run blocked: connected Fetcher nodes require entity context. Connect a Simulation node or run this workflow from the product surface.';
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
            reason: 'missing_entity_context',
            fetcherNodeTitles: fetcherTitles,
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
            reason: 'missing_entity_context',
            fetcherNodeTitles: fetcherTitles,
          },
        });
        args.toast(blockedMessage, { variant: 'error' });
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
        if (shouldAnnounceLaunch) {
          args.toast(`Launching workflow from ${triggerDisplayName}...`, { variant: 'info' });
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
            nodeType: triggerNode.type,
            nodeTitle: triggerNode.title ?? null,
            kind: 'node_status',
            level: 'info',
            message: `Node ${triggerNode.title ?? triggerNode.id} queued (${position}).`,
          });
          args.toast(`Run queued${position > 1 ? ` (${position} in queue)` : ''}.`, {
            variant: 'info',
          });
          return;
        }
        args.toast('A run is already in progress.', { variant: 'info' });
        return;
      }
      if (shouldAnnounceLaunch) {
        args.toast(`Workflow started from ${triggerDisplayName}.`, { variant: 'info' });
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
          currentRun: {
            id: runId,
            status: 'running',
            startedAt,
            pathId: args.activePathId ?? null,
            pathName: args.pathName,
          },
          inputs: {},
          outputs: nextOutputs,
          history: previousState.history ?? {},
          hashes: {},
          hashTimestamps: {},
          nodeOutputs: {},
        };
        args.runtimeStateRef.current = nextState;
        args.setRuntimeState(nextState);
      }

      const loopResult = await loop.runLocalLoop(mode);
      if (loopResult.status === 'paused') {
        args.setRunStatus('paused');
        args.appendRuntimeEvent({
          source: 'local',
          kind: 'run_paused',
          level: 'info',
          message: 'Run paused.',
        });
        return;
      }

      args.runInFlightRef.current = false;
      args.setRunStatus('idle');
      args.abortControllerRef.current = null;
      args.pauseRequestedRef.current = false;

      outcome.finalizeLocalRunOutcome(loopResult, {
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
    },
    [
      getConnectedSimulationNodesForTrigger,
      getConnectedFetcherNodesForTrigger,
      resolveConnectedSimulationBridgeForTrigger,
      resolveSimulationContextForNode,
    ]
  );

  const handleLocalRun = useCallback(
    (
      triggerNode: AiNode,
      event?: React.MouseEvent,
      contextOverride?: Record<string, unknown>
    ): void => {
      void runGraphForTrigger(triggerNode, event, contextOverride, { mode: 'run' });
    },
    [runGraphForTrigger]
  );

  const handleLocalStep = useCallback(
    (
      triggerNode: AiNode,
      event?: React.MouseEvent,
      contextOverride?: Record<string, unknown>
    ): void => {
      void runGraphForTrigger(triggerNode, event, contextOverride, { mode: 'step' });
    },
    [runGraphForTrigger]
  );

  const handleCancelLocalRun = useCallback((): void => {
    const a = argsRef.current;
    if (a.abortControllerRef.current) {
      a.abortControllerRef.current.abort();
    }
    a.pauseRequestedRef.current = false;
    a.runLoopActiveRef.current = false;
    a.runInFlightRef.current = false;
    a.setRunStatus('idle');
  }, []);

  const handleClearLocalRun = useCallback((): void => {
    const args = argsRef.current;
    handleCancelLocalRun();
    args.resetRuntimeNodeStatuses({});
    const clearedState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
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
  }, [handleCancelLocalRun]);

  const handleSyncSimulationOutputs = useCallback(
    (simulationNode: AiNode, context: Record<string, unknown>): void => {
      const args = argsRef.current;
      const simulationOutputs = buildSimulationOutputsFromContext(context);
      args.setRuntimeState((prev: RuntimeState): RuntimeState => {
        const nextSimulationOutputs = mergeRuntimeNodeOutputsForStatus({
          previous: prev.outputs?.[simulationNode.id],
          next: simulationOutputs,
          status: 'completed',
        });
        const next: RuntimeState = {
          ...prev,
          outputs: {
            ...(prev.outputs ?? {}),
            [simulationNode.id]: nextSimulationOutputs,
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
    },
    []
  );

  const handleTriggerConnectedSimulation = useCallback(
    async (
      triggerNode: AiNode,
      contextFallback?: Record<string, unknown> | null
    ): Promise<void> => {
      const connectedSimulationNodes = getConnectedSimulationNodesForTrigger(triggerNode.id);
      if (connectedSimulationNodes.length === 0) return;
      for (const simulationNode of connectedSimulationNodes) {
        const context = await resolveSimulationContextForNode(simulationNode, contextFallback);
        if (context) {
          handleSyncSimulationOutputs(simulationNode, context);
        }
      }
    },
    [
      getConnectedSimulationNodesForTrigger,
      handleSyncSimulationOutputs,
      resolveSimulationContextForNode,
    ]
  );

  return {
    runGraphForTrigger,
    handleLocalRun,
    handleLocalStep,
    handleCancelLocalRun,
    handleClearLocalRun,
    handleSyncSimulationOutputs,
    handleTriggerConnectedSimulation,
    getConnectedSimulationNodesForTrigger,
    getConnectedFetcherNodesForTrigger,
    resolveSimulationContextForNode,
  };
}
