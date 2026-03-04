'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';

import type { AiNode, Edge, RuntimeState } from '@/shared/lib/ai-paths';
import { normalizeNodes, sanitizeEdges, aiJobsApi } from '@/shared/lib/ai-paths';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import {
  useRuntimeActions,
  useRuntimeState,
} from '@/features/ai/ai-paths/context/RuntimeContext';

import { useAiPathsLocalExecution } from './runtime/useAiPathsLocalExecution';
import { useAiPathsRuntimeState } from './runtime/useAiPathsRuntimeState';
import { useAiPathsServerExecution } from './runtime/useAiPathsServerExecution';
import { useAiPathsSimulation } from './runtime/useAiPathsSimulation';
import { createRunId } from './runtime/utils';

import type { UseAiPathsRuntimeArgs, UseAiPathsRuntimeResult, QueuedRun } from './runtime/types';

export function useAiPathsRuntime(args: UseAiPathsRuntimeArgs): UseAiPathsRuntimeResult {
  const runtimeContextState = useRuntimeState();
  const runtimeContextActions = useRuntimeActions();
  const setRuntimeState = runtimeContextActions.setRuntimeState;
  const setLastRunAt = runtimeContextActions.setLastRunAt;
  const parserSamples = runtimeContextState.parserSamples;
  const updaterSamples = runtimeContextState.updaterSamples;
  const sendingToAi = runtimeContextState.sendingToAi;
  const brainAssignment = useBrainAssignment({
    capability: 'ai_paths.model',
  });

  // Shared refs
  const runtimeStateRef = useRef<RuntimeState>(runtimeContextState.runtimeState);
  const runInFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseRequestedRef = useRef(false);
  const runLoopActiveRef = useRef(false);
  const queuedRunsRef = useRef<QueuedRun[]>([]);
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const lastTriggerEventRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const currentRunStartedAtRef = useRef<string | null>(null);
  const currentRunStartedAtMsRef = useRef<number | null>(null);
  const fetchEntityByTypeRef = useRef<
    (entityType: string, entityId: string) => Promise<Record<string, unknown> | null>
      >(async () => null);

  // 1. Centralized State
  const state = useAiPathsRuntimeState();

  // Memos
  const normalizedNodes = useMemo((): AiNode[] => normalizeNodes(args.nodes), [args.nodes]);
  const sanitizedEdges = useMemo(
    (): Edge[] => sanitizeEdges(normalizedNodes, args.edges),
    [args.edges, normalizedNodes]
  );

  const hasPendingIteratorAdvance = useCallback(
    (rtState: RuntimeState): boolean =>
      normalizedNodes.some((node: AiNode): boolean => {
        if (node.type !== 'iterator') return false;
        if (node.config?.iterator?.autoContinue === false) return false;
        const status = rtState.outputs?.[node.id]?.['status'];
        return status === 'advance_pending';
      }),
    [normalizedNodes]
  );
  const fetchEntityByType = useCallback(
    (entityType: string, entityId: string): Promise<Record<string, unknown> | null> =>
      fetchEntityByTypeRef.current(entityType, entityId),
    []
  );

  // 2. Server execution engine
  const server = useAiPathsServerExecution({
    ...args,
    ...state,
    parserSamples,
    updaterSamples,
    setRuntimeState,
    setLastRunAt,
    normalizedNodes,
    sanitizedEdges,
    runtimeStateRef,
    currentRunIdRef,
    currentRunStartedAtRef,
  });

  // 3. Local execution engine
  const local = useAiPathsLocalExecution({
    ...args,
    ...state,
    ...server,
    parserSamples,
    updaterSamples,
    setRuntimeState,
    setLastRunAt,
    normalizedNodes,
    sanitizedEdges,
    runtimeStateRef,
    runInFlightRef,
    abortControllerRef,
    pauseRequestedRef,
    runLoopActiveRef,
    queuedRunsRef,
    currentRunIdRef,
    currentRunStartedAtRef,
    currentRunStartedAtMsRef,
    lastTriggerNodeIdRef,
    lastTriggerEventRef,
    triggerContextRef,
    sessionUser: null,
    hasPendingIteratorAdvance,
    fetchEntityByType,
  });

  // 4. Simulation logic
  const simulation = useAiPathsSimulation({
    ...args,
    setRuntimeState,
    normalizedNodes,
    sanitizedEdges,
    runtimeStateRef,
    runGraphForTrigger: local.runGraphForTrigger,
  });
  fetchEntityByTypeRef.current = simulation.fetchEntityByType;

  // Effect to sync refs
  useEffect(() => {
    runtimeStateRef.current = runtimeContextState.runtimeState;
  }, [runtimeContextState.runtimeState]);

  // Cleanup only on unmount. Depending on the whole `server` object causes
  // cleanup to fire on normal rerenders, which aborts active local runs.
  useEffect(() => {
    return () => {
      server.stopServerRunStream();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [server.stopServerRunStream]);

  // Additional High-level Handlers
  const handleFireTrigger = useCallback(
    (triggerNode: AiNode, event?: React.MouseEvent) => {
      void local.runGraphForTrigger(triggerNode, event);
    },
    [local]
  );

  const handleFireTriggerPersistent = useCallback(
    async (triggerNode: AiNode, event?: React.MouseEvent) => {
      await local.runGraphForTrigger(triggerNode, event);
    },
    [local]
  );

  const resolvePreviewModelNode = useCallback(
    (
      sourceNodeId: string
    ): { kind: 'resolved'; node: AiNode } | { kind: 'missing' } | { kind: 'ambiguous' } => {
      const visited = new Set<string>([sourceNodeId]);
      let frontier = [sourceNodeId];

      while (frontier.length > 0) {
        const nextFrontier: string[] = [];
        const candidateIds = new Set<string>();

        frontier.forEach((nodeId: string): void => {
          sanitizedEdges.forEach((edge: Edge): void => {
            if (edge.from !== nodeId || !edge.to) return;
            const targetId = edge.to;
            const targetNode = normalizedNodes.find(
              (node: AiNode): boolean => node.id === targetId
            );
            if (!targetNode) return;
            if (targetNode.type === 'model') {
              candidateIds.add(targetId);
              return;
            }
            if (visited.has(targetId)) return;
            visited.add(targetId);
            nextFrontier.push(targetId);
          });
        });

        if (candidateIds.size === 1) {
          const targetId = Array.from(candidateIds)[0];
          const targetNode = normalizedNodes.find((node: AiNode): boolean => node.id === targetId);
          if (targetNode) {
            return { kind: 'resolved', node: targetNode };
          }
        }
        if (candidateIds.size > 1) {
          return { kind: 'ambiguous' };
        }
        frontier = nextFrontier;
      }

      return { kind: 'missing' };
    },
    [normalizedNodes, sanitizedEdges]
  );

  const handleSendToAi = async (sourceNodeId: string, prompt: string): Promise<void> => {
    const modelResolution = resolvePreviewModelNode(sourceNodeId);
    if (modelResolution.kind === 'missing') {
      args.toast('No AI Model found downstream from this node.', { variant: 'error' });
      return;
    }
    if (modelResolution.kind === 'ambiguous') {
      args.toast(
        'Could not resolve a unique AI model node for preview. Connect or select a specific Model node.',
        { variant: 'error' }
      );
      return;
    }
    const aiNode = modelResolution.node;
    const modelConfig = aiNode.config?.model ?? {
      temperature: 0.7,
      maxTokens: 800,
      vision: aiNode.inputs.includes('images'),
    };
    const selectedModelId = modelConfig.modelId?.trim() || '';
    const aiModelId = brainAssignment.effectiveModelId.trim();
    if (
      !brainAssignment.assignment.enabled ||
      brainAssignment.assignment.provider !== 'model' ||
      (selectedModelId === '' && !aiModelId)
    ) {
      args.toast('Configure AI Paths in AI Brain first.', { variant: 'error' });
      return;
    }

    runtimeContextActions.setSendingToAi(true);
    let directJobId: string | null = null;

    try {
      const sourceOutputs = runtimeContextState.runtimeState.outputs?.[sourceNodeId] ?? {};
      const payload = {
        prompt,
        ...(selectedModelId ? { modelId: selectedModelId } : {}),
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        vision: modelConfig.vision ?? false,
        ...(modelConfig.systemPrompt?.trim()
          ? { systemPrompt: modelConfig.systemPrompt.trim() }
          : {}),
        source: 'ai_paths',
        graph: {
          pathId: args.activePathId ?? undefined,
          nodeId: aiNode.id,
          nodeTitle: aiNode.title,
          runId: `preview-${createRunId()}`,
        },
        context: sourceOutputs,
      };

      const res = await aiJobsApi.enqueue({
        productId:
          (typeof sourceOutputs['productId'] === 'string' ? sourceOutputs['productId'] : '') ||
          args.activePathId ||
          'direct',
        type: 'graph_model',
        payload,
      });

      if (!res.ok) throw new Error(res.error);
      directJobId = res.data.jobId;

      // Simple polling for direct AI prompt
      let result = '';
      let attempts = 0;
      while (attempts < 30) {
        const statusRes = await aiJobsApi.poll(directJobId);
        if (!statusRes.ok) {
          throw new Error(statusRes.error || 'Failed to fetch AI job status.');
        }
        if (statusRes.data.status === 'completed') {
          const rawResult = statusRes.data.result;
          if (typeof rawResult === 'string') {
            result = rawResult;
          } else if (rawResult && typeof rawResult === 'object') {
            const nestedResult = (rawResult as Record<string, unknown>)['result'];
            result =
              typeof nestedResult === 'string' ? nestedResult : JSON.stringify(rawResult ?? '');
          } else {
            result = JSON.stringify(rawResult ?? '');
          }
          break;
        }
        if (statusRes.data.status === 'failed') {
          throw new Error(statusRes.data.error || 'AI job failed.');
        }
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }

      if (!result) throw new Error('AI prompt timed out.');

      setRuntimeState((prev: RuntimeState): RuntimeState => {
        const aiOutputs = prev.outputs?.[aiNode.id] ?? {};

        return {
          ...prev,
          outputs: {
            ...(prev.outputs ?? {}),
            [aiNode.id]: {
              ...aiOutputs,
              result,
              jobId: directJobId!,
              status: 'completed',
              modelId: selectedModelId || aiModelId,
            },
          },
        };
      });
      args.toast('AI response received.', { variant: 'success' });
    } catch (error) {
      args.reportAiPathsError(
        error,
        { action: 'sendToAi', nodeId: sourceNodeId },
        'Send to AI failed:'
      );
      args.toast('Send to AI failed.', { variant: 'error' });
    } finally {
      runtimeContextActions.setSendingToAi(false);
    }
  };

  const clearNodeCache = useCallback(
    (nodeId: string): void => {
      setRuntimeState((prev: RuntimeState) => {
        const nextHashes = { ...(prev.hashes ?? {}) };
        const nextTimestamps = { ...(prev.hashTimestamps ?? {}) };
        delete nextHashes[nodeId];
        delete nextTimestamps[nodeId];
        return {
          ...prev,
          hashes: Object.keys(nextHashes).length > 0 ? nextHashes : undefined,
          hashTimestamps: Object.keys(nextTimestamps).length > 0 ? nextTimestamps : undefined,
        };
      });
      const currentStatus = state.runtimeNodeStatusesRef.current[nodeId];
      if (currentStatus === 'cached') {
        const next = { ...state.runtimeNodeStatusesRef.current };
        delete next[nodeId];
        state.runtimeNodeStatusesRef.current = next;
        state.setRuntimeNodeStatuses(next);
      }
      state.appendRuntimeEvent({
        source: 'local',
        kind: 'node_status',
        level: 'info',
        nodeId,
        message: `Cache cleared for node ${nodeId}.`,
      });
    },
    [setRuntimeState, state]
  );

  const resetRuntimeDiagnostics = useCallback((): void => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    server.stopServerRunStream();
    runInFlightRef.current = false;
    pauseRequestedRef.current = false;
    runLoopActiveRef.current = false;
    queuedRunsRef.current = [];
    lastTriggerNodeIdRef.current = null;
    lastTriggerEventRef.current = null;
    triggerContextRef.current = null;
    currentRunIdRef.current = null;
    currentRunStartedAtRef.current = null;
    currentRunStartedAtMsRef.current = null;
    runtimeContextActions.setSendingToAi(false);
    state.setRunStatus('idle');
    state.resetRuntimeNodeStatuses({});
    state.setRuntimeEvents([]);
  }, [
    runtimeContextActions,
    server.stopServerRunStream,
    state.resetRuntimeNodeStatuses,
    state.setRunStatus,
    state.setRuntimeEvents,
  ]);

  return {
    handleRunSimulation: simulation.handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseRun: () => {
      pauseRequestedRef.current = true;
    },
    handleResumeRun: () => {
      void local.runLocalLoop('run');
    },
    handleStepRun: (triggerNode?: AiNode) => {
      if (triggerNode) {
        void local.runGraphForTrigger(triggerNode, undefined, undefined, { mode: 'step' });
      } else {
        void local.runLocalLoop('step');
      }
    },
    handleCancelRun: () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (server.serverRunActiveRef.current) server.stopServerRunStream();
    },
    runStatus: state.runStatus,
    handleSendToAi,
    sendingToAi,
    runtimeNodeStatuses: state.runtimeNodeStatuses,
    runtimeEvents: state.runtimeEvents,
    nodeDurations: state.nodeDurations,
    clearNodeCache,
    resetRuntimeDiagnostics,
  };
}
