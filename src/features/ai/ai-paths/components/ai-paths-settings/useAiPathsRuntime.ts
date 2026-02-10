'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AiNode,
  Edge,
  RuntimeState,
  RuntimePortValues,
} from '@/features/ai/ai-paths/lib';
import {
  normalizeNodes,
  sanitizeEdges,
  aiJobsApi,
} from '@/features/ai/ai-paths/lib';

import { useAiPathsRuntimeState } from './runtime/useAiPathsRuntimeState';
import { useAiPathsServerExecution } from './runtime/useAiPathsServerExecution';
import { useAiPathsLocalExecution } from './runtime/useAiPathsLocalExecution';
import { useAiPathsSimulation } from './runtime/useAiPathsSimulation';
import { 
  createRunId, 
} from './runtime/utils';
import type { 
  UseAiPathsRuntimeArgs, 
  UseAiPathsRuntimeResult, 
  QueuedRun 
} from './runtime/types';

export function useAiPathsRuntime(args: UseAiPathsRuntimeArgs): UseAiPathsRuntimeResult {
  const [sendingToAi, setSendingToAi] = useState(false);
  
  // Shared refs
  const runtimeStateRef = useRef<RuntimeState>(args.runtimeState);
  const runInFlightRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pauseRequestedRef = useRef(false);
  const runLoopActiveRef = useRef(false);
  const queuedRunsRef = useRef<QueuedRun[]>([]);
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const lastTriggerEventRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const pendingSimulationContextRef = useRef<Record<string, unknown> | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const currentRunStartedAtRef = useRef<string | null>(null);
  const currentRunStartedAtMsRef = useRef<number | null>(null);

  // 1. Centralized State
  const state = useAiPathsRuntimeState();

  // Memos
  const normalizedNodes = useMemo((): AiNode[] => normalizeNodes(args.nodes), [args.nodes]);
  const sanitizedEdges = useMemo(
    (): Edge[] => sanitizeEdges(normalizedNodes, args.edges),
    [args.edges, normalizedNodes]
  );

  // Handlers required by engine
  const seedImmediateDownstreamInputs = useCallback(
    (
      inputs: Record<string, RuntimePortValues>,
      allOutputs: Record<string, RuntimePortValues>,
      fromNodeId: string
    ): Record<string, RuntimePortValues> => {
      const nextInputs: Record<string, RuntimePortValues> = { ...inputs };
      const nodeOutputs = allOutputs[fromNodeId];
      if (!nodeOutputs) return nextInputs;
      sanitizedEdges.forEach((edge: Edge): void => {
        if (edge.from !== fromNodeId || !edge.to) return;
        const rawFromPort = edge.fromPort?.trim() || 'context';
        const fromPort = rawFromPort === 'simulation' ? 'context' : rawFromPort;
        const toPort = edge.toPort?.trim() || fromPort;
        const value = (nodeOutputs as Record<string, unknown>)[fromPort];
        if (value === undefined) return;
        nextInputs[edge.to] = {
          ...(nextInputs[edge.to] ?? {}),
          [toPort]: value,
        };
      });

      return nextInputs;
    },
    [sanitizedEdges]
  );

  const hasPendingIteratorAdvance = useCallback(
    (rtState: RuntimeState): boolean =>
      normalizedNodes.some((node: AiNode): boolean => {
        if (node.type !== 'iterator') return false;
        if (node.config?.iterator?.autoContinue === false) return false;
        const status = (rtState.outputs[node.id] as Record<string, unknown> | undefined)?.['status'];
        return status === 'advance_pending';
      }),
    [normalizedNodes]
  );

  // 2. Server execution engine
  const server = useAiPathsServerExecution({
    ...args,
    ...state,
    normalizedNodes,
    sanitizedEdges,
    runtimeStateRef,
    currentRunIdRef,
    currentRunStartedAtRef
  });

  // 3. Local execution engine
  const local = useAiPathsLocalExecution({
    ...args,
    ...state,
    ...server,
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
    pendingSimulationContextRef,
    sessionUser: null,
    hasPendingIteratorAdvance,
    seedImmediateDownstreamInputs,
    fetchEntityByType: async (_type, _id) => {
      return null;
    }
  });

  // 4. Simulation logic
  const simulation = useAiPathsSimulation({
    ...args,
    normalizedNodes,
    sanitizedEdges,
    runtimeStateRef,
    pendingSimulationContextRef,
    runGraphForTrigger: local.runGraphForTrigger
  });

  // Effect to sync refs
  useEffect(() => {
    runtimeStateRef.current = args.runtimeState;
  }, [args.runtimeState]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      server.stopServerRunStream();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [server]);

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

  const handleSendToAi = async (sourceNodeId: string, prompt: string): Promise<void> => {
    const aiNode = normalizedNodes.find((n) => n.type === 'model');
    if (!aiNode) {
      args.toast('No AI Model found in path.', { variant: 'error' });
      return;
    }
    const modelConfig = aiNode.config?.model;
    if (!modelConfig?.modelId) {
      args.toast('AI Model node is not configured.', { variant: 'error' });
      return;
    }

    setSendingToAi(true);
    const startedAt = new Date().toISOString();
    let directJobId: string | null = null;

    try {
      const sourceOutputs = args.runtimeState.outputs[sourceNodeId] ?? {};
      const payload = {
        prompt,
        model: modelConfig.modelId,
        context: sourceOutputs,
      };

      const res = await aiJobsApi.enqueue({
        productId: (sourceOutputs as Record<string, any>)['productId'] ?? 'direct',
        type: 'direct_prompt',
        payload,
      });

      if (!res.ok) throw new Error(res.error);
      directJobId = res.data.jobId;

      // Simple polling for direct AI prompt
      let result = '';
      let attempts = 0;
      while (attempts < 30) {
        const statusRes = await fetch(`/api/products/ai-jobs/${directJobId}`);
        const statusData = await statusRes.json();
        if (statusData.job?.status === 'completed') {
          result = statusData.job.result;
          break;
        }
        if (statusData.job?.status === 'failed') {
          throw new Error(statusData.job.errorMessage || 'AI job failed.');
        }
        await new Promise((r) => setTimeout(r, 2000));
        attempts++;
      }

      if (!result) throw new Error('AI prompt timed out.');

      const resolvedRunId = createRunId();
      const resolvedRunStartedAt = startedAt;

      args.setRuntimeState((prev: RuntimeState): RuntimeState => {
        const aiOutputs = (prev.outputs[aiNode.id] ?? {}) as Record<string, any>;
        
        return {
          ...prev,
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          outputs: {
            ...prev.outputs,
            [aiNode.id]: {
              ...aiOutputs,
              result,
              jobId: directJobId!,
              status: 'completed',
            },
          },
        };
      });
      args.toast('AI response received.', { variant: 'success' });
    } catch (error) {
      args.reportAiPathsError(error, { action: 'sendToAi', nodeId: sourceNodeId }, 'Send to AI failed:');
      args.toast('Send to AI failed.', { variant: 'error' });
    } finally {
      setSendingToAi(false);
    }
  };

  const clearNodeCache = useCallback(
    (nodeId: string): void => {
      args.setRuntimeState((prev: RuntimeState) => {
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
    [args, state]
  );

  return {
    handleRunSimulation: simulation.handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseRun: () => { pauseRequestedRef.current = true; },
    handleResumeRun: () => { void local.runLocalLoop('run'); },
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
    clearNodeCache,
  };
}