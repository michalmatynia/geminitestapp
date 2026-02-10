'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AiNode,
  AiPathRunEventRecord,
  DbQueryConfig,
  Edge,
  ParserSampleState,
  AiPathRuntimeEvent,
  AiPathRuntimeEventKind,
  AiPathRuntimeNodeStatus,
  AiPathRuntimeNodeStatusMap,
  PathConfig,
  PathDebugEntry,
  PathDebugSnapshot,
  PathExecutionMode,
  PathRunMode,
  AiPathRunRecord,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import {
  PATH_DEBUG_PREFIX,
  STORAGE_VERSION,
  TRIGGER_EVENTS,
  inspectGraphIntegrity,
  normalizeNodes,
  sanitizeEdges,
  appendLocalRun,
  aiJobsApi,
  coerceInput,
  entityApi,
  evaluateGraph,
  evaluateGraphWithIteratorAutoContinue,
  GraphExecutionError,
  GraphExecutionCancelled,
  runsApi,
} from '@/features/ai/ai-paths/lib';
import { buildFallbackEntity, extractImageUrls } from '@/features/ai/ai-paths/lib/core/runtime/utils';
import { useUpdateSetting } from '@/shared/hooks/use-settings';

import {
  DEFAULT_DB_QUERY,
  pollDatabaseQuery,
  pollGraphJob,
  parseRuntimeState,
  safeJsonStringify,
} from '../AiPathsSettingsUtils';

const AI_PATHS_SESSION_STALE_MS = 30_000;
const AI_PATHS_ENTITY_STALE_MS = 10_000;


const LOCAL_RUN_STEP_CHUNK = 25;
const MAX_RUNTIME_EVENTS = 300;
const NON_SETTLED_RUNTIME_NODE_STATUSES = new Set<string>([
  'idle',
  'queued',
  'completed',
  'failed',
  'canceled',
  'cancelled',
  'cached',
  'blocked',
  'skipped',
  'timeout',
]);
const TRANSIENT_RUNTIME_NODE_STATUSES = new Set<string>([
  'queued',
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);
const IDLE_REHYDRATION_BLOCKED_NODE_STATUSES = new Set<string>([
  'completed',
  'cached',
  'canceled',
  'cancelled',
]);

type ToastFn = (message: string, options?: Partial<{ variant: 'success' | 'error' | 'info'; duration: number }>) => void;

type QueuedRun = {
  triggerNodeId: string;
  pathId: string | null;
  contextOverride?: Record<string, unknown> | null;
  queuedAt: string;
};

type RuntimeEventInput = Omit<AiPathRuntimeEvent, 'id' | 'timestamp'> & {
  id?: string | undefined;
  timestamp?: string | undefined;
};

type UseAiPathsRuntimeArgs = {
  activePathId: string | null;
  activeTab: 'canvas' | 'paths' | 'docs';
  isPathActive: boolean;
  activeTrigger: string;
  executionMode: PathExecutionMode;
  runMode: PathRunMode;
  edges: Edge[];
  nodes: AiNode[];
  pathDescription: string;
  pathName: string;
  parserSamples: Record<string, ParserSampleState>;
  updaterSamples: Record<string, UpdaterSampleState>;
  runtimeState: RuntimeState;
  lastRunAt: string | null;
  setLastRunAt: (value: string | null) => void;
  setPathConfigs: React.Dispatch<React.SetStateAction<Record<string, PathConfig>>>;
  setPathDebugSnapshots: React.Dispatch<
    React.SetStateAction<Record<string, PathDebugSnapshot>>
  >;
  setRuntimeState: React.Dispatch<React.SetStateAction<RuntimeState>>;
  toast: ToastFn;
  reportAiPathsError: (
    error: unknown,
    context: Record<string, unknown>,
    fallbackMessage?: string
  ) => void;
};

type UseAiPathsRuntimeResult = {
  handleRunSimulation: (simulationNode: AiNode, triggerEvent?: string) => Promise<void>;
  handleFireTrigger: (triggerNode: AiNode, event?: React.MouseEvent) => void;
  handleFireTriggerPersistent: (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ) => Promise<void>;
  handlePauseRun: () => void;
  handleResumeRun: () => void;
  handleStepRun: (triggerNode?: AiNode) => void;
  handleCancelRun: () => void;
  runStatus: 'idle' | 'running' | 'paused' | 'stepping';
  handleSendToAi: (sourceNodeId: string, prompt: string) => Promise<void>;
  sendingToAi: boolean;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[];
  clearNodeCache: (nodeId: string) => void;
};

export function useAiPathsRuntime({
  activePathId,
  activeTab,
  isPathActive,
  activeTrigger,
  executionMode,
  runMode,
  edges,
  nodes,
  pathDescription,
  pathName,
  parserSamples,
  updaterSamples,
  runtimeState,
  lastRunAt,
  setLastRunAt,
  setPathConfigs,
  setPathDebugSnapshots,
  setRuntimeState,
  toast,
  reportAiPathsError,
}: UseAiPathsRuntimeArgs): UseAiPathsRuntimeResult {
  const [sendingToAi, setSendingToAi] = useState(false);
  const [runStatus, setRunStatus] = useState<'idle' | 'running' | 'paused' | 'stepping'>('idle');
  const [runtimeNodeStatuses, setRuntimeNodeStatuses] = useState<AiPathRuntimeNodeStatusMap>({});
  const [runtimeEvents, setRuntimeEvents] = useState<AiPathRuntimeEvent[]>([]);

  const pollInFlightRef = useRef<Set<string>>(new Set());
  const iteratorContinueInFlightRef = useRef(false);
  const lastTriggerNodeIdRef = useRef<string | null>(null);
  const lastTriggerEventRef = useRef<string | null>(null);
  const triggerContextRef = useRef<Record<string, unknown> | null>(null);
  const pendingSimulationContextRef = useRef<Record<string, unknown> | null>(null);
  const currentRunIdRef = useRef<string | null>(null);
  const currentRunStartedAtRef = useRef<string | null>(null);
  const currentRunStartedAtMsRef = useRef<number | null>(null);
  const runStatusRef = useRef(runStatus);
  const runLoopActiveRef = useRef(false);
  const pauseRequestedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const serverRunStreamRef = useRef<EventSource | null>(null);
  const serverRunIdRef = useRef<string | null>(null);
  const serverRunActiveRef = useRef(false);
  const runInFlightRef = useRef(false);
  const queuedRunsRef = useRef<QueuedRun[]>([]);
  const runtimeStateRef = useRef<RuntimeState>({ inputs: {}, outputs: {} });
  const runtimeNodeStatusesRef = useRef<AiPathRuntimeNodeStatusMap>({});
  const lastServerRunStatusRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const updateSettingMutation = useUpdateSetting();
  const normalizedNodes = useMemo((): AiNode[] => normalizeNodes(nodes), [nodes]);
  const sanitizedEdges = useMemo(
    (): Edge[] => sanitizeEdges(normalizedNodes, edges),
    [edges, normalizedNodes]
  );
  const graphGuardWarningsRef = useRef<Set<string>>(new Set());

  const enqueueAiJobMutation = useMutation({
    mutationFn: async (payload: {
      productId: string;
      type: string;
      payload: unknown;
    }): Promise<unknown> => {
      const result = await aiJobsApi.enqueue(payload);
      if (!result.ok) {
        throw new Error(result.error || 'Failed to enqueue AI job.');
      }
      return result.data;
    },
  });

  const sessionQuery = useQuery({
    queryKey: ['auth-session'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      return (await res.json()) as {
        user?: { id?: string; name?: string | null; email?: string | null };
      };
    },
    staleTime: AI_PATHS_SESSION_STALE_MS,
  });

  const sessionUser = useMemo(() => {
    const user = sessionQuery.data?.user;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
    };
  }, [sessionQuery.data]);

  const createRunId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `run_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
  }, []);

  useEffect((): void => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  useEffect((): void => {
    runStatusRef.current = runStatus;
  }, [runStatus]);

  const updateRunStatus = useCallback(
    (status: 'idle' | 'running' | 'paused' | 'stepping'): void => {
      runStatusRef.current = status;
      setRunStatus(status);
    },
    []
  );

  const normalizeNodeStatus = useCallback((value: unknown): AiPathRuntimeNodeStatus | null => {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    return normalized as AiPathRuntimeNodeStatus;
  }, []);

  const formatStatusLabel = useCallback((status: AiPathRuntimeNodeStatus): string => {
    return status
      .split('_')
      .map((part) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
      .join(' ');
  }, []);

  const appendRuntimeEvent = useCallback((input: RuntimeEventInput): void => {
    const event: AiPathRuntimeEvent = {
      id:
        input.id ??
        (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`),
      timestamp: input.timestamp ?? new Date().toISOString(),
      source: input.source,
      kind: input.kind,
      level: input.level,
      message: input.message,
      ...(input.runId !== undefined ? { runId: input.runId } : {}),
      ...(input.runStartedAt !== undefined ? { runStartedAt: input.runStartedAt } : {}),
      ...(input.nodeId !== undefined ? { nodeId: input.nodeId } : {}),
      ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
      ...(input.nodeTitle !== undefined ? { nodeTitle: input.nodeTitle } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };
    setRuntimeEvents((prev: AiPathRuntimeEvent[]): AiPathRuntimeEvent[] => {
      const next = [...prev, event];
      if (next.length > MAX_RUNTIME_EVENTS) {
        return next.slice(next.length - MAX_RUNTIME_EVENTS);
      }
      return next;
    });
  }, []);

  const resetRuntimeNodeStatuses = useCallback((next: AiPathRuntimeNodeStatusMap = {}): void => {
    runtimeNodeStatusesRef.current = next;
    setRuntimeNodeStatuses(next);
  }, []);

  const settleTransientNodeStatuses = useCallback(
    (terminalStatus: 'completed' | 'failed' | 'canceled'): void => {
      const currentStatuses = runtimeNodeStatusesRef.current;
      const currentOutputs = runtimeStateRef.current.outputs ?? {};
      const nextStatuses: AiPathRuntimeNodeStatusMap = { ...currentStatuses };
      const candidateNodeIds = new Set<string>([
        ...Object.keys(currentStatuses),
        ...Object.keys(currentOutputs),
      ]);
      let changed = false;
      candidateNodeIds.forEach((nodeId: string) => {
        const outputStatus = ((currentOutputs[nodeId] ?? {}) as Record<string, unknown>)['status'];
        const normalizedStatus = normalizeNodeStatus(nextStatuses[nodeId] ?? outputStatus);
        if (!normalizedStatus) return;
        if (NON_SETTLED_RUNTIME_NODE_STATUSES.has(normalizedStatus)) return;
        if (nextStatuses[nodeId] === terminalStatus) return;
        nextStatuses[nodeId] = terminalStatus;
        changed = true;
      });
      if (!changed) return;
      runtimeNodeStatusesRef.current = nextStatuses;
      setRuntimeNodeStatuses(nextStatuses);
    },
    [normalizeNodeStatus]
  );

  const setNodeStatus = useCallback(
    (input: {
      nodeId: string;
      status: unknown;
      source: 'local' | 'server';
      runId?: string | null | undefined;
      runStartedAt?: string | null | undefined;
      iteration?: number | undefined;
      nodeType?: string | null | undefined;
      nodeTitle?: string | null | undefined;
      kind?: AiPathRuntimeEventKind | undefined;
      level?: 'info' | 'warning' | 'error' | undefined;
      message?: string | undefined;
      metadata?: Record<string, unknown> | null | undefined;
    }): void => {
      const normalizedStatus = normalizeNodeStatus(input.status);
      if (!normalizedStatus) return;
      const prevStatus = runtimeNodeStatusesRef.current[input.nodeId];
      if (prevStatus === normalizedStatus) return;
      const next = {
        ...runtimeNodeStatusesRef.current,
        [input.nodeId]: normalizedStatus,
      };
      runtimeNodeStatusesRef.current = next;
      setRuntimeNodeStatuses(next);
      appendRuntimeEvent({
        source: input.source,
        kind: input.kind ?? 'node_status',
        level: input.level ?? 'info',
        message: input.message ?? `Node ${input.nodeTitle ?? input.nodeId} is ${formatStatusLabel(normalizedStatus)}.`,
        ...(input.runId !== undefined ? { runId: input.runId } : {}),
        ...(input.runStartedAt !== undefined ? { runStartedAt: input.runStartedAt } : {}),
        nodeId: input.nodeId,
        ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
        ...(input.nodeTitle !== undefined ? { nodeTitle: input.nodeTitle } : {}),
        status: normalizedStatus,
        ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      });
    },
    [appendRuntimeEvent, formatStatusLabel, normalizeNodeStatus]
  );

  /**
   * Batched version of setNodeStatus — applies multiple status changes in 2 setState calls
   * instead of 2N. Used by SSE event handlers where N nodes arrive in a single event.
   */
  const batchNodeStatusUpdates = useCallback(
    (updates: Array<{
      nodeId: string;
      status: unknown;
      source: 'local' | 'server';
      runId?: string | null | undefined;
      runStartedAt?: string | null | undefined;
      iteration?: number | undefined;
      nodeType?: string | null | undefined;
      nodeTitle?: string | null | undefined;
      kind?: AiPathRuntimeEventKind | undefined;
      level?: 'info' | 'warning' | 'error' | undefined;
      message?: string | undefined;
      metadata?: Record<string, unknown> | null | undefined;
    }>): void => {
      const currentStatuses = runtimeNodeStatusesRef.current;
      const nextStatuses: AiPathRuntimeNodeStatusMap = { ...currentStatuses };
      const batchedEvents: AiPathRuntimeEvent[] = [];
      let statusChanged = false;

      for (const input of updates) {
        const normalized = normalizeNodeStatus(input.status);
        if (!normalized) continue;
        if (nextStatuses[input.nodeId] === normalized) continue;
        nextStatuses[input.nodeId] = normalized;
        statusChanged = true;
        batchedEvents.push({
          id:
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
          timestamp: new Date().toISOString(),
          source: input.source,
          kind: input.kind ?? 'node_status',
          level: input.level ?? 'info',
          message:
            input.message ??
            `Node ${input.nodeTitle ?? input.nodeId} is ${formatStatusLabel(normalized)}.`,
          ...(input.runId !== undefined ? { runId: input.runId } : {}),
          ...(input.runStartedAt !== undefined ? { runStartedAt: input.runStartedAt } : {}),
          nodeId: input.nodeId,
          ...(input.nodeType !== undefined ? { nodeType: input.nodeType } : {}),
          ...(input.nodeTitle !== undefined ? { nodeTitle: input.nodeTitle } : {}),
          status: normalized,
          ...(input.iteration !== undefined ? { iteration: input.iteration } : {}),
          ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
        });
      }

      if (statusChanged) {
        runtimeNodeStatusesRef.current = nextStatuses;
        setRuntimeNodeStatuses(nextStatuses);
      }
      if (batchedEvents.length > 0) {
        setRuntimeEvents((prev: AiPathRuntimeEvent[]): AiPathRuntimeEvent[] => {
          const next = [...prev, ...batchedEvents];
          return next.length > MAX_RUNTIME_EVENTS ? next.slice(-MAX_RUNTIME_EVENTS) : next;
        });
      }
    },
    [formatStatusLabel, normalizeNodeStatus]
  );

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
      const currentStatus = runtimeNodeStatusesRef.current[nodeId];
      if (currentStatus === 'cached') {
        const next = { ...runtimeNodeStatusesRef.current };
        delete next[nodeId];
        runtimeNodeStatusesRef.current = next;
        setRuntimeNodeStatuses(next);
      }
      appendRuntimeEvent({
        source: 'local',
        kind: 'node_status',
        level: 'info',
        nodeId,
        message: `Cache cleared for node ${nodeId}.`,
      });
    },
    [appendRuntimeEvent]
  );

  useEffect((): void => {
    const validNodeIds = new Set(normalizedNodes.map((node: AiNode): string => node.id));
    const current = runtimeNodeStatusesRef.current;
    let changed = false;
    const next: AiPathRuntimeNodeStatusMap = {};
    Object.entries(current).forEach(([nodeId, status]: [string, AiPathRuntimeNodeStatus]) => {
      if (!validNodeIds.has(nodeId)) {
        changed = true;
        return;
      }
      next[nodeId] = status;
    });
    if (!changed) return;
    resetRuntimeNodeStatuses(next);
  }, [normalizedNodes, resetRuntimeNodeStatuses]);

  useEffect((): void => {
    const hasActiveRun =
      runInFlightRef.current ||
      serverRunActiveRef.current ||
      runStatusRef.current !== 'idle';
    Object.entries(runtimeState.outputs ?? {}).forEach(([nodeId, nodeOutputs]: [string, RuntimePortValues]) => {
      const status = (nodeOutputs as Record<string, unknown>)?.['status'];
      if (typeof status !== 'string') return;
      const normalizedStatus = normalizeNodeStatus(status);
      if (!normalizedStatus) return;
      if (
        !hasActiveRun &&
        (TRANSIENT_RUNTIME_NODE_STATUSES.has(normalizedStatus) ||
          IDLE_REHYDRATION_BLOCKED_NODE_STATUSES.has(normalizedStatus))
      ) {
        return;
      }
      const node = normalizedNodes.find((candidate: AiNode): boolean => candidate.id === nodeId);
      setNodeStatus({
        nodeId,
        status,
        source: executionMode === 'server' ? 'server' : 'local',
        nodeType: node?.type,
        nodeTitle: node?.title ?? null,
      });
    });
  }, [executionMode, normalizeNodeStatus, normalizedNodes, runtimeState.outputs, setNodeStatus]);

  useEffect((): void => {
    const hasActiveRun =
      runInFlightRef.current ||
      serverRunActiveRef.current ||
      runStatusRef.current !== 'idle';
    if (hasActiveRun) return;
    const current = runtimeNodeStatusesRef.current;
    let changed = false;
    const next: AiPathRuntimeNodeStatusMap = {};
    Object.entries(current).forEach(([nodeId, status]: [string, AiPathRuntimeNodeStatus]) => {
      if (IDLE_REHYDRATION_BLOCKED_NODE_STATUSES.has(status)) {
        changed = true;
        return;
      }
      next[nodeId] = status;
    });
    if (!changed) return;
    runtimeNodeStatusesRef.current = next;
    setRuntimeNodeStatuses(next);
  }, [runStatus, runtimeNodeStatuses]);

  const fetchProductById = useCallback(
    async (productId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ['products', productId],
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getProduct(productId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_ENTITY_STALE_MS,
        });
      } catch (error) {
        reportAiPathsError(error, { action: 'fetchProduct', productId }, 'Failed to fetch product:');
        return null;
      }
    },
    [queryClient, reportAiPathsError]
  );

  const fetchNoteById = useCallback(
    async (noteId: string): Promise<Record<string, unknown> | null> => {
      try {
        return await queryClient.fetchQuery({
          queryKey: ['notes', noteId],
          queryFn: async (): Promise<Record<string, unknown> | null> => {
            const result = await entityApi.getNote(noteId);
            return result.ok ? result.data : null;
          },
          staleTime: AI_PATHS_ENTITY_STALE_MS,
        });
      } catch (error) {
        reportAiPathsError(error, { action: 'fetchNote', noteId }, 'Failed to fetch note:');
        return null;
      }
    },
    [queryClient, reportAiPathsError]
  );

  const normalizeEntityType = (value?: string | null): string | null => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === 'product' || normalized === 'products') return 'product';
    if (normalized === 'note' || normalized === 'notes') return 'note';
    return normalized;
  };

  const fetchEntityByType = useCallback(
    async (entityType: string, entityId: string): Promise<Record<string, unknown> | null> => {
      if (!entityType || !entityId) return null;
      const normalized = normalizeEntityType(entityType);
      if (normalized === 'product') {
        return fetchProductById(entityId);
      }
      if (normalized === 'note') {
        return fetchNoteById(entityId);
      }
      return null;
    },
    [fetchProductById, fetchNoteById]
  );

  const buildSimulationContext = useCallback(
    (
      entityId: string,
      entityType: string,
      entity?: Record<string, unknown> | null
    ): Record<string, unknown> => {
      const fallbackEntity: Record<string, unknown> = {
        ...buildFallbackEntity(entityId),
        id: entityId,
        entityId,
        entityType,
        ...(entityType === 'product' ? { productId: entityId } : {}),
      };
      const scopedEntity = entity ?? fallbackEntity;
      const imageUrls = extractImageUrls(scopedEntity);
      return {
        entityId,
        entityType,
        ...(entityType === 'product' ? { productId: entityId } : {}),
        ...(imageUrls.length ? { images: imageUrls, imageUrls } : {}),
        entity: scopedEntity,
        entityJson: scopedEntity,
        ...(entityType === 'product' ? { product: scopedEntity } : {}),
      };
    },
    []
  );

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

  const seedSimulationRuntimeState = useCallback(
    (simulationNode: AiNode, simulationContext: Record<string, unknown>): void => {
      if (executionMode !== 'local') return;
      const entityId =
        typeof simulationContext['entityId'] === 'string' ? (simulationContext['entityId']) : null;
      const entityType =
        typeof simulationContext['entityType'] === 'string' ? (simulationContext['entityType']) : null;
      const productId =
        typeof simulationContext['productId'] === 'string' ? (simulationContext['productId']) : null;
      const simulationOutputs: RuntimePortValues = {
        context: simulationContext,
        ...(entityId ? { entityId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(productId ? { productId } : {}),
        ...(simulationContext['entityJson'] !== undefined
          ? { entityJson: simulationContext['entityJson'] }
          : {}),
      };
      setRuntimeState((prev: RuntimeState): RuntimeState => {
        const nextOutputs = {
          ...prev.outputs,
          [simulationNode.id]: {
            ...((prev.outputs[simulationNode.id] ?? {}) as Record<string, unknown>),
            ...simulationOutputs,
          },
        };
        // Seed only immediate downstream inputs so visual flow matches causal execution.
        const nextInputs = seedImmediateDownstreamInputs(
          prev.inputs,
          nextOutputs,
          simulationNode.id
        );
        const next: RuntimeState = {
          ...prev,
          inputs: nextInputs,
          outputs: nextOutputs,
        };
        runtimeStateRef.current = next;
        return next;
      });
    },
    [executionMode, seedImmediateDownstreamInputs, setRuntimeState]
  );

  const buildActivePathConfig = useCallback(
    (updatedAt: string): PathConfig => ({
      id: activePathId ?? 'default',
      version: STORAGE_VERSION,
      name: pathName,
      description: pathDescription,
      trigger: activeTrigger,
      executionMode,
      runMode,
      nodes: normalizedNodes,
      edges: sanitizedEdges,
      updatedAt,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    }),
    [
      activePathId,
      pathName,
      pathDescription,
      activeTrigger,
      executionMode,
      runMode,
      normalizedNodes,
      sanitizedEdges,
      parserSamples,
      updaterSamples,
      runtimeState,
      lastRunAt,
    ]
  );

  const toIsoString = (value?: Date | string | null): string | null => {
    if (!value) return null;
    if (typeof value === 'string') return value;
    return value.toISOString();
  };

  const resolveRunStartedAt = (run: AiPathRunRecord, parsed: RuntimeState): string | null => {
    if (parsed.runStartedAt) return parsed.runStartedAt;
    return toIsoString(run.startedAt);
  };

  const resolveRunAt = (run: AiPathRunRecord): string => {
    return (
      toIsoString(run.finishedAt) ??
      toIsoString(run.updatedAt) ??
      toIsoString(run.startedAt) ??
      new Date().toISOString()
    );
  };

  const mergeRuntimeStateSnapshot = useCallback(
    (
      current: RuntimeState,
      incoming: RuntimeState,
      runId?: string | null,
      runStartedAt?: string
    ): RuntimeState => {
      const nextInputs: Record<string, RuntimePortValues> = {
        ...(current.inputs ?? {}),
        ...(incoming.inputs ?? {}),
      };
      const nextOutputs: Record<string, RuntimePortValues> = {
        ...(current.outputs ?? {}),
        ...(incoming.outputs ?? {}),
      };

      const incomingHashes = incoming.hashes ?? undefined;
      const hasIncomingHashes =
        !!incomingHashes && Object.keys(incomingHashes).length > 0;
      const mergedHashes =
        hasIncomingHashes
          ? { ...(current.hashes ?? {}), ...(incomingHashes ?? {}) }
          : current.hashes;

      const incomingHistory = incoming.history ?? undefined;
      const hasIncomingHistory =
        !!incomingHistory && Object.keys(incomingHistory).length > 0;
      const mergedHistory =
        hasIncomingHistory
          ? { ...(current.history ?? {}), ...(incomingHistory ?? {}) }
          : current.history;

      const next: RuntimeState = {
        ...current,
        ...incoming,
        inputs: nextInputs,
        outputs: nextOutputs,
        ...(runId ? { runId } : {}),
        ...(runStartedAt ? { runStartedAt } : {}),
      };
      if (mergedHashes !== undefined) {
        next.hashes = mergedHashes;
      }
      if (mergedHistory !== undefined) {
        next.history = mergedHistory;
      }
      return next;
    },
    []
  );

  const stopServerRunStream = useCallback((): void => {
    const source = serverRunStreamRef.current;
    if (source) {
      source.close();
    }
    serverRunStreamRef.current = null;
    serverRunIdRef.current = null;
    serverRunActiveRef.current = false;
  }, []);

  const applyServerRunUpdate = useCallback((run: AiPathRunRecord): void => {
    if (serverRunIdRef.current && run.id !== serverRunIdRef.current) return;
    if (activePathId && run.pathId && run.pathId !== activePathId) return;
    const serverStatus = typeof run.status === 'string' ? run.status.trim().toLowerCase() : '';
    if (serverStatus && lastServerRunStatusRef.current !== serverStatus) {
      lastServerRunStatusRef.current = serverStatus;
      appendRuntimeEvent({
        source: 'server',
        kind:
          serverStatus === 'queued'
            ? 'run_started'
            : serverStatus === 'running'
              ? 'run_started'
              : serverStatus === 'paused'
                ? 'run_paused'
                : serverStatus === 'completed'
                  ? 'run_completed'
                  : serverStatus === 'canceled'
                    ? 'run_canceled'
                    : 'run_failed',
        level: serverStatus === 'failed' ? 'error' : 'info',
        message: `Run ${serverStatus}.`,
        runId: run.id ?? null,
      });
    }
    if (serverStatus === 'completed') {
      settleTransientNodeStatuses('completed');
    } else if (serverStatus === 'canceled') {
      settleTransientNodeStatuses('canceled');
    } else if (serverStatus === 'failed' || serverStatus === 'dead_lettered') {
      settleTransientNodeStatuses('failed');
    }
    if (!run.runtimeState) return;
    const parsed = parseRuntimeState(run.runtimeState);
    const runStartedAt = resolveRunStartedAt(run, parsed) ?? undefined;
    const nextState = mergeRuntimeStateSnapshot(
      runtimeStateRef.current,
      parsed,
      run.id ?? undefined,
      runStartedAt
    );
    runtimeStateRef.current = nextState;
    setRuntimeState(nextState);
    currentRunIdRef.current = run.id ?? null;
    if (runStartedAt) {
      currentRunStartedAtRef.current = runStartedAt;
    }
    const runAt = resolveRunAt(run);
    setLastRunAt(runAt);
    if (activePathId) {
      setPathConfigs((prev: Record<string, PathConfig>) => ({
        ...prev,
        [activePathId]: {
          ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
          runtimeState: nextState,
          lastRunAt: runAt,
        },
      }));
    }
  }, [
    activePathId,
    appendRuntimeEvent,
    buildActivePathConfig,
    mergeRuntimeStateSnapshot,
    settleTransientNodeStatuses,
    setLastRunAt,
    setPathConfigs,
    setRuntimeState,
  ]);

  const startServerRunStream = useCallback((runId: string): void => {
    if (!runId) return;
    stopServerRunStream();
    serverRunActiveRef.current = true;
    serverRunIdRef.current = runId;
    lastServerRunStatusRef.current = null;
    resetRuntimeNodeStatuses({});
    appendRuntimeEvent({
      source: 'server',
      kind: 'log',
      level: 'info',
      runId,
      message: 'Connected to run stream.',
    });
    const url = `/api/ai-paths/runs/${encodeURIComponent(runId)}/stream`;
    const source = new EventSource(url);
    serverRunStreamRef.current = source;

    source.addEventListener('run', (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as AiPathRunRecord;
        applyServerRunUpdate(payload);
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('nodes', (event: Event) => {
      try {
        const nodes = JSON.parse((event as MessageEvent).data) as Array<{
          nodeId: string;
          status: string;
          cached?: boolean;
          inputs?: RuntimePortValues | null;
          outputs?: RuntimePortValues | null;
        }>;
        // Apply per-node status to runtimeState for immediate UI feedback
        setRuntimeState((prev: RuntimeState) => {
          const nextOutputs = { ...(prev.outputs ?? {}) };
          const nextInputs = { ...(prev.inputs ?? {}) };
          let changed = false;
          for (const node of nodes) {
            const effectiveStatus = node.cached ? 'cached' : node.status;
            const prevOut = (nextOutputs[node['nodeId']] ?? {}) as Record<string, unknown>;
            if (prevOut['status'] !== effectiveStatus) {
              nextOutputs[node['nodeId']] = { ...prevOut, status: effectiveStatus } as RuntimePortValues;
              changed = true;
            }
            if (node['inputs']) {
              nextInputs[node['nodeId']] = node['inputs'];
              changed = true;
            }
            if (node['outputs']) {
              nextOutputs[node['nodeId']] = { ...(nextOutputs[node['nodeId']] as Record<string, unknown> ?? {}), ...node['outputs'], status: effectiveStatus } as RuntimePortValues;
              changed = true;
            }
          }
          if (!changed) return prev;
          return { ...prev, inputs: nextInputs, outputs: nextOutputs };
        });
        // Batched: 2 setState calls instead of 2N
        batchNodeStatusUpdates(
          nodes.map((node) => {
            const runtimeNode = normalizedNodes.find((candidate: AiNode): boolean => candidate.id === node.nodeId);
            const effectiveStatus = node.cached ? 'cached' : node.status;
            const ns = typeof effectiveStatus === 'string' ? effectiveStatus.trim().toLowerCase() : '';
            return {
              nodeId: node.nodeId,
              status: effectiveStatus,
              source: 'server' as const,
              runId,
              nodeType: runtimeNode?.type,
              nodeTitle: runtimeNode?.title ?? null,
              kind:
                (ns === 'running'
                  ? 'node_started'
                  : ns === 'failed'
                    ? 'node_failed'
                    : 'node_status') as AiPathRuntimeEventKind,
              level: (ns === 'failed' ? 'error' : 'info') as 'info' | 'error',
            };
          })
        );
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('events', (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          events: AiPathRunEventRecord[];
          overflow?: boolean;
          limit?: number;
        };
        const eventBatch = Array.isArray(payload.events) ? payload.events : [];
        // Batched: 2 setState calls (statuses + events) instead of up to 3M
        const statusUpdates: Array<Parameters<typeof batchNodeStatusUpdates>[0][number]> = [];
        const logEvents: AiPathRuntimeEvent[] = [];

        eventBatch.forEach((item: AiPathRunEventRecord) => {
          const metadata = (item.metadata ?? {});
          const nodeId = typeof metadata['nodeId'] === 'string' ? metadata['nodeId'] : undefined;
          const status = typeof metadata['status'] === 'string' ? metadata['status'] : undefined;
          const iteration =
            typeof metadata['iteration'] === 'number' && Number.isFinite(metadata['iteration'])
              ? metadata['iteration']
              : undefined;
          const runtimeNode = nodeId
            ? normalizedNodes.find((candidate: AiNode): boolean => candidate.id === nodeId)
            : undefined;

          if (nodeId && status) {
            const ns = status.trim().toLowerCase();
            statusUpdates.push({
              nodeId,
              status,
              source: 'server' as const,
              runId,
              nodeType: runtimeNode?.type,
              nodeTitle:
                typeof metadata['nodeTitle'] === 'string'
                  ? metadata['nodeTitle']
                  : runtimeNode?.title ?? null,
              kind:
                (ns === 'running'
                  ? 'node_started'
                  : ns === 'failed'
                    ? 'node_failed'
                    : 'node_status') as AiPathRuntimeEventKind,
              level: item.level,
              message: item.message,
              ...(iteration !== undefined ? { iteration } : {}),
              metadata,
            });
          }

          logEvents.push({
            id:
              typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                ? crypto.randomUUID()
                : `evt_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
            timestamp:
              typeof item.createdAt === 'string'
                ? item.createdAt
                : item.createdAt instanceof Date
                  ? item.createdAt.toISOString()
                  : new Date().toISOString(),
            source: 'server',
            kind: 'log',
            level: item.level,
            runId,
            message: item.message,
            ...(nodeId ? { nodeId } : {}),
            ...(status ? { status: status.trim().toLowerCase() as AiPathRuntimeNodeStatus } : {}),
            ...(iteration !== undefined ? { iteration } : {}),
            metadata,
          });
        });

        if (statusUpdates.length > 0) {
          batchNodeStatusUpdates(statusUpdates);
        }
        if (logEvents.length > 0) {
          setRuntimeEvents((prev: AiPathRuntimeEvent[]): AiPathRuntimeEvent[] => {
            const next = [...prev, ...logEvents];
            return next.length > MAX_RUNTIME_EVENTS ? next.slice(-MAX_RUNTIME_EVENTS) : next;
          });
        }
        if (payload.overflow) {
          appendRuntimeEvent({
            source: 'server',
            kind: 'log',
            level: 'warning',
            runId,
            message: `Run stream event batch reached limit (${payload.limit ?? eventBatch.length}).`,
          });
        }
      } catch {
        // ignore parse errors
      }
    });
    source.addEventListener('done', (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { status?: string };
        const status = typeof payload.status === 'string' ? payload.status.trim().toLowerCase() : 'completed';
        if (status === 'completed') {
          settleTransientNodeStatuses('completed');
        } else if (status === 'canceled') {
          settleTransientNodeStatuses('canceled');
        } else {
          settleTransientNodeStatuses('failed');
        }
        appendRuntimeEvent({
          source: 'server',
          kind:
            status === 'completed'
              ? 'run_completed'
              : status === 'canceled'
                ? 'run_canceled'
                : status === 'paused'
                  ? 'run_paused'
                  : 'run_failed',
          level: status === 'failed' ? 'error' : 'info',
          runId,
          message: `Run ${status}.`,
        });
      } catch {
        settleTransientNodeStatuses('completed');
        appendRuntimeEvent({
          source: 'server',
          kind: 'run_completed',
          level: 'info',
          runId,
          message: 'Run completed.',
        });
      }
      stopServerRunStream();
    });
    source.addEventListener('error', () => {
      appendRuntimeEvent({
        source: 'server',
        kind: 'log',
        level: 'warning',
        runId,
        message: 'Run stream disconnected.',
      });
      stopServerRunStream();
    });
  }, [
    applyServerRunUpdate,
    appendRuntimeEvent,
    batchNodeStatusUpdates,
    normalizedNodes,
    resetRuntimeNodeStatuses,
    settleTransientNodeStatuses,
    setRuntimeState,
    stopServerRunStream,
  ]);

  useEffect(() => {
    if (executionMode !== 'server') {
      stopServerRunStream();
    }
  }, [executionMode, stopServerRunStream]);

  useEffect(() => {
    return () => {
      stopServerRunStream();
    };
  }, [activePathId, stopServerRunStream]);

  useEffect((): void => {
    resetRuntimeNodeStatuses({});
    setRuntimeEvents([]);
  }, [activePathId, resetRuntimeNodeStatuses]);

  useEffect((): void => {
    graphGuardWarningsRef.current.clear();
  }, [activePathId]);

  const emitGraphIntegrityWarnings = useCallback(
    (source: 'local' | 'server'): void => {
      const report = inspectGraphIntegrity(normalizedNodes, sanitizedEdges);
      if (report.invalidEdgeCount > 0) {
        const warningKey = `${activePathId ?? 'default'}:invalid_edges:${report.invalidEdgeCount}`;
        if (!graphGuardWarningsRef.current.has(warningKey)) {
          graphGuardWarningsRef.current.add(warningKey);
          const message = `Detected ${report.invalidEdgeCount} invalid wire(s). Reconnect and save path to avoid runtime skips.`;
          appendRuntimeEvent({
            source,
            kind: 'log',
            level: 'warning',
            message,
          });
          toast(message, { variant: 'info' });
        }
      }

      if (report.disconnectedProcessingNodes.length > 0) {
        const disconnectedIds = report.disconnectedProcessingNodes
          .map((node) => node.nodeId)
          .sort()
          .join(',');
        const warningKey = `${activePathId ?? 'default'}:disconnected:${disconnectedIds}`;
        if (!graphGuardWarningsRef.current.has(warningKey)) {
          graphGuardWarningsRef.current.add(warningKey);
          const preview = report.disconnectedProcessingNodes
            .slice(0, 3)
            .map((node) => `${node.nodeTitle} (${node.nodeId})`)
            .join(', ');
          const suffix =
            report.disconnectedProcessingNodes.length > 3
              ? ` and ${report.disconnectedProcessingNodes.length - 3} more`
              : '';
          const message = `Disconnected processing node(s): ${preview}${suffix}. They will not receive runtime data until wired.`;
          appendRuntimeEvent({
            source,
            kind: 'log',
            level: 'warning',
            message,
          });
          toast(message, { variant: 'info' });
        }
      }
    },
    [activePathId, appendRuntimeEvent, normalizedNodes, sanitizedEdges, toast]
  );

  const getDomSelector = useCallback((element: Element | null): string | null => {
    if (!element) return null;
    const selectorEscape = (val: string): string => {
      if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
        return CSS.escape(val);
      }
      return val.replace(/[^\w-]/g, '\\$&');
    };
    const dataSelector =
      element.getAttribute('data-component') ||
      element.getAttribute('data-testid') ||
      element.getAttribute('data-node');
    if (dataSelector) {
      const attr =
        element.getAttribute('data-component') !== null
          ? 'data-component'
          : element.getAttribute('data-testid') !== null
            ? 'data-testid'
            : 'data-node';
      return `${element.tagName.toLowerCase()}[${attr}="${selectorEscape(dataSelector)}"]`;
    }
    if (element.id) {
      return `#${selectorEscape(element.id)}`;
    }
    const segments: string[] = [];
    let current: Element | null = element;
    while (current && current.tagName.toLowerCase() !== 'html' && segments.length < 5) {
      const tagName = current.tagName.toLowerCase();
      const parent: HTMLElement | null = current.parentElement;
      if (!parent) break;
      const siblings: Element[] = Array.from(parent.children).filter(
        (child: Element): boolean => child.tagName === (current as Element).tagName
      );
      const index: number = siblings.indexOf(current) + 1;
      segments.unshift(`${tagName}:nth-of-type(${index})`);
      if (parent.id) {
        segments.unshift(`#${selectorEscape(parent.id)}`);
        break;
      }
      current = parent as Element;
    }
    return segments.length ? segments.join(' > ') : element.tagName.toLowerCase();
  }, []);

  const getTargetInfo = useCallback((event?: React.MouseEvent): Record<string, unknown> | null => {
    const target = event?.target as Element | null;
    if (!target) return null;
    const element =
      target.closest(
        '[data-component],[data-testid],[data-node],button,a,[role=\'button\']'
      ) ?? target;
    const rect = element.getBoundingClientRect();
    const dataset = element instanceof HTMLElement ? element.dataset : undefined;
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.getAttribute('class') || undefined,
      name: element.getAttribute('name') || undefined,
      type: element.getAttribute('type') || undefined,
      role: element.getAttribute('role') || undefined,
      ariaLabel: element.getAttribute('aria-label') || undefined,
      dataComponent: element.getAttribute('data-component') || undefined,
      dataTestId: element.getAttribute('data-testid') || undefined,
      dataNode: element.getAttribute('data-node') || undefined,
      selector: getDomSelector(element),
      boundingClientRect: {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      },
      dataset: dataset ? { ...dataset } : undefined,
    };
  }, [getDomSelector]);

  const buildDebugSnapshot = useCallback(
    (pathId: string | null, runAt: string, state: RuntimeState): PathDebugSnapshot | null => {
      if (!pathId) return null;
      const entries = normalizedNodes
        .filter((node: AiNode): boolean => node.type === 'database')
        .map((node: AiNode): PathDebugEntry | null => {
          const output = state.outputs[node.id] as
            | { debugPayload?: unknown }
            | undefined;
          const debugPayload = output?.debugPayload;
          if (debugPayload === undefined || debugPayload === null) return null;
          return {
            nodeId: node.id,
            title: node.title,
            debug: debugPayload,
          };
        })
        .filter((entry: PathDebugEntry | null): entry is PathDebugEntry => entry !== null);
      if (entries.length === 0) return null;
      return { pathId, runAt, entries };
    },
    [normalizedNodes]
  );

  const persistDebugSnapshot = useCallback(
    async (pathId: string | null, runAt: string, state: RuntimeState): Promise<void> => {
      if (!pathId) return;
      const snapshot = buildDebugSnapshot(pathId, runAt, state);
      if (!snapshot) return;
      const payload = safeJsonStringify(snapshot);
      if (!payload) return;
      try {
        await updateSettingMutation.mutateAsync({
          key: `${PATH_DEBUG_PREFIX}${pathId}`,
          value: payload,
        });
        setPathDebugSnapshots((prev: Record<string, PathDebugSnapshot>) => ({
          ...prev,
          [pathId]: snapshot,
        }));
      } catch (error) {
        console.warn('[AI Paths] Failed to persist debug snapshot.', error);
      }
    },
    [buildDebugSnapshot, updateSettingMutation, setPathDebugSnapshots]
  );

  const buildTriggerContext = useCallback((
    triggerNode: AiNode,
    triggerEvent: string,
    event?: React.MouseEvent
  ): Record<string, unknown> => {
    const timestamp = new Date().toISOString();
    const nativeEvent = event?.nativeEvent;
    const pointer = nativeEvent
      ? {
        clientX: nativeEvent.clientX,
        clientY: nativeEvent.clientY,
        pageX: nativeEvent.pageX,
        pageY: nativeEvent.pageY,
        screenX: nativeEvent.screenX,
        screenY: nativeEvent.screenY,
        offsetX: 'offsetX' in nativeEvent ? nativeEvent.offsetX : undefined,
        offsetY: 'offsetY' in nativeEvent ? nativeEvent.offsetY : undefined,
        button: nativeEvent.button,
        buttons: nativeEvent.buttons,
        altKey: nativeEvent.altKey,
        ctrlKey: nativeEvent.ctrlKey,
        shiftKey: nativeEvent.shiftKey,
        metaKey: nativeEvent.metaKey,
      }
      : undefined;
    const targetInfo = getTargetInfo(event);
    const location =
      typeof window !== 'undefined'
        ? {
          href: window.location.href,
          origin: window.location.origin,
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          referrer: document.referrer || undefined,
        }
        : {};
    const ui =
      typeof window !== 'undefined'
        ? {
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio,
          },
          screen: {
            width: window.screen?.width,
            height: window.screen?.height,
            availWidth: window.screen?.availWidth,
            availHeight: window.screen?.availHeight,
          },
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          languages: navigator.languages,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          documentTitle: document.title,
          visibilityState: document.visibilityState,
          scroll: {
            x: window.scrollX,
            y: window.scrollY,
          },
        }
        : {};
    return {
      timestamp,
      location,
      ui,
      user: sessionUser,
      event: {
        id: triggerEvent,
        nodeId: triggerNode.id,
        nodeTitle: triggerNode.title,
        type: event?.type,
        pointer,
        target: targetInfo,
      },
      source: {
        pathId: activePathId,
        pathName,
        tab: activeTab,
      },
      extras: {
        triggerLabel: activeTrigger,
      },
    };
  }, [getTargetInfo, sessionUser, activePathId, pathName, activeTab, activeTrigger]);

  const hasPendingIteratorAdvance = useCallback(
    (state: RuntimeState): boolean =>
      normalizedNodes.some((node: AiNode): boolean => {
        if (node.type !== 'iterator') return false;
        if (node.config?.iterator?.autoContinue === false) return false;
        const status = (state.outputs[node.id] as Record<string, unknown> | undefined)?.['status'];
        return status === 'advance_pending';
      }),
    [normalizedNodes]
  );

  const runLocalLoop = useCallback(
    async (
      mode: 'run' | 'step'
    ): Promise<{ status: 'completed' | 'paused' | 'canceled' | 'error'; error?: unknown; state: RuntimeState }> => {
      if (runLoopActiveRef.current) {
        return { status: 'paused', state: runtimeStateRef.current };
      }
      runLoopActiveRef.current = true;
      const stepLimit = mode === 'step' ? 1 : LOCAL_RUN_STEP_CHUNK;
      let outcome: 'completed' | 'paused' | 'canceled' | 'error' = 'completed';
      let capturedError: unknown = undefined;
      try {
        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
          abortControllerRef.current = new AbortController();
        }
        if (mode === 'run') {
          pauseRequestedRef.current = false;
        }
        updateRunStatus(mode === 'step' ? 'stepping' : 'running');
        let state = runtimeStateRef.current;
        while (true) {
          const runId =
            currentRunIdRef.current ?? state.runId ?? createRunId();
          const runStartedAt =
            currentRunStartedAtRef.current ??
            state.runStartedAt ??
            new Date().toISOString();
          currentRunIdRef.current = runId;
          currentRunStartedAtRef.current = runStartedAt;
          if (!currentRunStartedAtMsRef.current) {
            const parsed = Date.parse(runStartedAt);
            currentRunStartedAtMsRef.current = Number.isNaN(parsed) ? Date.now() : parsed;
          }
          const haltRef = { reason: 'completed' as 'completed' | 'step_limit' | 'cancelled' };
          const nextState = await evaluateGraph({
            nodes: normalizedNodes,
            edges: sanitizedEdges,
            activePathId,
            activePathName: pathName,
            runId,
            runStartedAt,
            triggerNodeId: lastTriggerNodeIdRef.current ?? undefined,
            triggerEvent: lastTriggerEventRef.current ?? undefined,
            triggerContext: triggerContextRef.current,
            deferPoll: true,
            recordHistory: true,
            historyLimit: 50,
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
              setNodeStatus({
                nodeId: node.id,
                status: 'running',
                source: 'local',
                runId: callbackRunId,
                runStartedAt: callbackRunStartedAt,
                nodeType: node.type,
                nodeTitle: node.title ?? null,
                iteration,
                kind: 'node_started',
                message: `Node ${node.title ?? node.id} started.`,
              });
              setRuntimeState((prev: RuntimeState): RuntimeState => {
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
                runtimeStateRef.current = next;
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
                normalizeNodeStatus(rawStatus) ?? (cached ? 'cached' : 'completed');
              setNodeStatus({
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
                    : `Node ${node.title ?? node.id} ${formatStatusLabel(normalizedStatus)}.`,
              });
              setRuntimeState((prev: RuntimeState): RuntimeState => {
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
                runtimeStateRef.current = next;
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
              setNodeStatus({
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
              setRuntimeState((prev: RuntimeState): RuntimeState => {
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
                runtimeStateRef.current = next;
                return next;
              });
            },
            fetchEntityByType,
            reportAiPathsError,
            toast,
            control: {
              mode,
              stepLimit,
              signal: abortControllerRef.current?.signal,
              onHalt: (payload) => {
                haltRef.reason = payload.reason;
              },
            },
          });
          state = nextState;
          runtimeStateRef.current = nextState;
          setRuntimeState(nextState);
          const iteratorPending = hasPendingIteratorAdvance(nextState);
          if (haltRef.reason === 'step_limit') {
            if (mode === 'step' || pauseRequestedRef.current) {
              outcome = 'paused';
              break;
            }
            continue;
          }
          if (iteratorPending) {
            if (mode === 'step' || pauseRequestedRef.current) {
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
          const errorState = error.state ?? runtimeStateRef.current;
          runtimeStateRef.current = errorState;
          setRuntimeState(errorState);
          outcome = 'canceled';
        } else {
          const errorState =
            error instanceof GraphExecutionError
              ? error.state
              : typeof error === 'object' && error && 'state' in error
                ? (error as { state?: RuntimeState }).state
                : undefined;
          if (errorState) {
            runtimeStateRef.current = errorState;
            setRuntimeState(errorState);
          }
          outcome = 'error';
        }
      } finally {
        runLoopActiveRef.current = false;
      }
      if (outcome === 'paused') {
        pauseRequestedRef.current = false;
      }
      return {
        status: outcome,
        error: capturedError,
        state: runtimeStateRef.current,
      };
    },
    [
      activePathId,
      createRunId,
      fetchEntityByType,
      formatStatusLabel,
      hasPendingIteratorAdvance,
      normalizeNodeStatus,
      normalizedNodes,
      pathName,
      reportAiPathsError,
      sanitizedEdges,
      setNodeStatus,
      setRuntimeState,
      toast,
      updateRunStatus,
    ]
  );

  const finalizeLocalRunOutcome = useCallback(
    (
      outcome: { status: 'completed' | 'paused' | 'canceled' | 'error'; error?: unknown; state: RuntimeState },
      meta: { startedAt: string; startedAtMs: number; triggerEvent: string | null; triggerContext: Record<string, unknown> | null }
    ): void => {
      const finishedAt = new Date().toISOString();
      if (outcome.status === 'completed') {
        settleTransientNodeStatuses('completed');
        appendRuntimeEvent({
          source: 'local',
          kind: 'run_completed',
          level: 'info',
          runId: currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message: 'Run completed.',
        });
        setLastRunAt(finishedAt);
        void persistDebugSnapshot(activePathId ?? null, finishedAt, outcome.state);
        if (activePathId) {
          setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [activePathId]: {
              ...(prev[activePathId] ?? buildActivePathConfig(finishedAt)),
              runtimeState: outcome.state,
              lastRunAt: finishedAt,
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
          pathId: activePathId ?? null,
          pathName: pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: activeTrigger ?? null,
          entityId,
          entityType,
          status: 'success',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: normalizedNodes.length,
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'error') {
        settleTransientNodeStatuses('failed');
        appendRuntimeEvent({
          source: 'local',
          kind: 'run_failed',
          level: 'error',
          runId: currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message:
            outcome.error instanceof Error ? `Run failed: ${outcome.error.message}` : 'Run failed.',
        });
        if (outcome.state) {
          setLastRunAt(finishedAt);
          if (activePathId) {
            setPathConfigs((prev: Record<string, PathConfig>) => ({
              ...prev,
              [activePathId]: {
                ...(prev[activePathId] ?? buildActivePathConfig(finishedAt)),
                runtimeState: outcome.state,
                lastRunAt: finishedAt,
              },
            }));
          }
        }
        void appendLocalRun({
          pathId: activePathId ?? null,
          pathName: pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: activeTrigger ?? null,
          status: 'error',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: normalizedNodes.length,
          error: outcome.error instanceof Error ? outcome.error.message : 'Local run failed',
          source: 'ai_paths_ui',
        });
        return;
      }

      if (outcome.status === 'canceled') {
        settleTransientNodeStatuses('canceled');
        appendRuntimeEvent({
          source: 'local',
          kind: 'run_canceled',
          level: 'info',
          runId: currentRunIdRef.current ?? outcome.state?.runId ?? null,
          runStartedAt: currentRunStartedAtRef.current ?? outcome.state?.runStartedAt ?? null,
          timestamp: finishedAt,
          message: 'Run cancelled.',
        });
        toast('Run cancelled.', { variant: 'info' });
        void appendLocalRun({
          pathId: activePathId ?? null,
          pathName: pathName ?? null,
          triggerEvent: (meta['triggerEvent'] ?? null),
          triggerLabel: activeTrigger ?? null,
          status: 'error',
          startedAt: (meta['startedAt'] ?? ''),
          finishedAt,
          durationMs: Date.now() - ((meta['startedAtMs'] ?? 0)),
          nodeCount: normalizedNodes.length,
          error: 'Run cancelled',
          source: 'ai_paths_ui',
        });
      }
    },
    [
      activePathId,
      activeTrigger,
      appendRuntimeEvent,
      buildActivePathConfig,
      normalizedNodes.length,
      pathName,
      persistDebugSnapshot,
      settleTransientNodeStatuses,
      setLastRunAt,
      setPathConfigs,
      toast,
    ]
  );

  const runGraphForTrigger = useCallback(async (
    triggerNode: AiNode,
    event?: React.MouseEvent,
    contextOverride?: Record<string, unknown>,
    options?: { mode?: 'run' | 'step' }
  ): Promise<void> => {
    const mode = options?.mode ?? 'run';
    if (!isPathActive) {
      toast('This path is deactivated. Activate it to run.', { variant: 'info' });
      return;
    }
    emitGraphIntegrityWarnings('local');
    if (serverRunActiveRef.current) {
      stopServerRunStream();
    }
    const triggerEvent =
      triggerNode.config?.trigger?.event ??
      TRIGGER_EVENTS[0]?.id ??
      'manual';
    if (runInFlightRef.current) {
      if (runMode === 'queue' && mode === 'run') {
        const queuedContext = {
          ...buildTriggerContext(triggerNode, triggerEvent, event),
          ...(pendingSimulationContextRef.current ?? {}),
          ...(contextOverride ?? {}),
        };
        pendingSimulationContextRef.current = null;
        queuedRunsRef.current.push({
          triggerNodeId: triggerNode.id,
          pathId: activePathId ?? null,
          contextOverride: queuedContext,
          queuedAt: new Date().toISOString(),
        });
        const position = queuedRunsRef.current.length;
        setNodeStatus({
          nodeId: triggerNode.id,
          status: 'queued',
          source: 'local',
          runId: currentRunIdRef.current ?? null,
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_status',
          message: `Node ${triggerNode.title ?? triggerNode.id} queued (${position}).`,
        });
        toast(`Run queued${position > 1 ? ` (${position} in queue)` : ''}.`, { variant: 'info' });
        return;
      }
      toast('A run is already in progress.', { variant: 'info' });
      return;
    }
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    const runId = createRunId();
    runInFlightRef.current = true;
    resetRuntimeNodeStatuses({});
    appendRuntimeEvent({
      source: 'local',
      kind: 'run_started',
      level: 'info',
      runId,
      runStartedAt: startedAt,
      timestamp: startedAt,
      message: mode === 'step' ? 'Step run started.' : 'Run started.',
    });
    currentRunIdRef.current = runId;
    currentRunStartedAtRef.current = startedAt;
    currentRunStartedAtMsRef.current = startedAtMs;
    lastTriggerNodeIdRef.current = triggerNode.id;
    lastTriggerEventRef.current = triggerEvent ?? null;
    setNodeStatus({
      nodeId: triggerNode.id,
      status: 'running',
      source: 'local',
      runId,
      runStartedAt: startedAt,
      nodeType: triggerNode.type,
      nodeTitle: triggerNode.title ?? null,
      kind: 'node_started',
      message: `Node ${triggerNode.title ?? triggerNode.id} started.`,
    });
    abortControllerRef.current = new AbortController();
    const simulationContext = pendingSimulationContextRef.current ?? null;
    const triggerContext = {
      ...buildTriggerContext(triggerNode, triggerEvent, event),
      ...(simulationContext ?? {}),
      ...(contextOverride ?? {}),
    };
    triggerContextRef.current = triggerContext;
    pendingSimulationContextRef.current = null;
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
      pathId: activePathId ?? null,
      source: triggerContext['source'] ?? null,
    };
    const immediateOutputs: RuntimePortValues = {
      trigger: true,
      triggerName: triggerEvent,
      meta: {
        firedAt: startedAt,
        trigger: triggerEvent,
        pathId: activePathId ?? null,
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
    if (executionMode === 'local') {
      setRuntimeState((prev: RuntimeState): RuntimeState => {
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
        // Seed only immediate downstream inputs so data does not appear to skip nodes.
        const nextInputs = seedImmediateDownstreamInputs(
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
        runtimeStateRef.current = next;
        return next;
      });
    }

    const outcome = await runLocalLoop(mode);
    if (outcome.status === 'paused') {
      updateRunStatus('paused');
      appendRuntimeEvent({
        source: 'local',
        kind: 'run_paused',
        level: 'info',
        runId,
        runStartedAt: startedAt,
        message: 'Run paused.',
      });
      return;
    }

    runInFlightRef.current = false;
    updateRunStatus('idle');
    abortControllerRef.current = null;
    pauseRequestedRef.current = false;

    finalizeLocalRunOutcome(outcome, {
      startedAt,
      startedAtMs,
      triggerEvent: triggerEvent ?? null,
      triggerContext,
    });

    if (runMode === 'queue' && queuedRunsRef.current.length > 0) {
      const next = queuedRunsRef.current.shift();
      if (next) {
        if (next.pathId !== (activePathId ?? null)) {
          toast('Queued run skipped (path changed).', { variant: 'info' });
          return;
        }
        const nextTrigger = normalizedNodes.find(
          (node: AiNode): boolean => node.id === next.triggerNodeId
        );
        if (!nextTrigger) {
          toast('Queued run skipped (trigger node missing).', { variant: 'info' });
          return;
        }
        void runGraphForTrigger(nextTrigger, undefined, next.contextOverride ?? undefined);
      }
    }
  }, [
    emitGraphIntegrityWarnings,
    isPathActive,
    buildTriggerContext,
    normalizedNodes,
    sanitizedEdges,
    activePathId,
    pathName,
    activeTrigger,
    appendRuntimeEvent,
    resetRuntimeNodeStatuses,
    toast,
    runMode,
    setNodeStatus,
    stopServerRunStream,
    createRunId,
    executionMode,
    runLocalLoop,
    seedImmediateDownstreamInputs,
    updateRunStatus,
    finalizeLocalRunOutcome,
  ]);

  const processQueuedRuns = useCallback((): void => {
    if (runMode !== 'queue' || queuedRunsRef.current.length === 0) return;
    const next = queuedRunsRef.current.shift();
    if (!next) return;
    if (next.pathId !== (activePathId ?? null)) {
      toast('Queued run skipped (path changed).', { variant: 'info' });
      return;
    }
    const nextTrigger = normalizedNodes.find(
      (node: AiNode): boolean => node.id === next.triggerNodeId
    );
    if (!nextTrigger) {
      toast('Queued run skipped (trigger node missing).', { variant: 'info' });
      return;
    }
    void runGraphForTrigger(nextTrigger, undefined, next.contextOverride ?? undefined);
  }, [runMode, activePathId, normalizedNodes, toast, runGraphForTrigger]);

  const pauseRun = useCallback((): void => {
    if (!runInFlightRef.current) return;
    if (runStatusRef.current === 'running' || runStatusRef.current === 'stepping') {
      pauseRequestedRef.current = true;
    }
  }, []);

  const resumeRun = useCallback((): void => {
    if (runStatusRef.current !== 'paused') return;
    const startedAt =
      currentRunStartedAtRef.current ?? runtimeStateRef.current.runStartedAt;
    const startedAtMs =
      currentRunStartedAtMsRef.current ??
      (startedAt ? Date.parse(startedAt) : Date.now());
    if (startedAt && !Number.isNaN(startedAtMs)) {
      currentRunStartedAtMsRef.current = startedAtMs;
    }
    pauseRequestedRef.current = false;
    if (!runInFlightRef.current) {
      runInFlightRef.current = true;
    }
    void (async (): Promise<void> => {
      const outcome = await runLocalLoop('run');
      if (outcome.status === 'paused') {
        updateRunStatus('paused');
        appendRuntimeEvent({
          source: 'local',
          kind: 'run_paused',
          level: 'info',
          runId: currentRunIdRef.current ?? null,
          runStartedAt: startedAt ?? null,
          message: 'Run paused.',
        });
        return;
      }
      runInFlightRef.current = false;
      updateRunStatus('idle');
      abortControllerRef.current = null;
      pauseRequestedRef.current = false;
      if (startedAt) {
        finalizeLocalRunOutcome(outcome, {
          startedAt,
          startedAtMs: Number.isNaN(startedAtMs) ? Date.now() : startedAtMs,
          triggerEvent: lastTriggerEventRef.current ?? null,
          triggerContext: triggerContextRef.current,
        });
      }
      processQueuedRuns();
    })();
  }, [appendRuntimeEvent, finalizeLocalRunOutcome, processQueuedRuns, runLocalLoop, updateRunStatus]);

  const stepRun = useCallback(
    (triggerNode?: AiNode): void => {
      if (runStatusRef.current === 'running') {
        toast('Pause the run to step through nodes.', { variant: 'info' });
        return;
      }
      if (runStatusRef.current === 'paused') {
        void (async (): Promise<void> => {
          const outcome = await runLocalLoop('step');
          if (outcome.status === 'paused') {
            updateRunStatus('paused');
            appendRuntimeEvent({
              source: 'local',
              kind: 'run_paused',
              level: 'info',
              runId: currentRunIdRef.current ?? null,
              runStartedAt: currentRunStartedAtRef.current ?? runtimeStateRef.current.runStartedAt ?? null,
              message: 'Run paused.',
            });
            return;
          }
          runInFlightRef.current = false;
          updateRunStatus('idle');
          abortControllerRef.current = null;
          pauseRequestedRef.current = false;
          const startedAt =
            currentRunStartedAtRef.current ?? runtimeStateRef.current.runStartedAt;
          const startedAtMs =
            currentRunStartedAtMsRef.current ??
            (startedAt ? Date.parse(startedAt) : Date.now());
          if (startedAt) {
            finalizeLocalRunOutcome(outcome, {
              startedAt,
              startedAtMs: Number.isNaN(startedAtMs) ? Date.now() : startedAtMs,
              triggerEvent: lastTriggerEventRef.current ?? null,
              triggerContext: triggerContextRef.current,
            });
          }
          processQueuedRuns();
        })();
        return;
      }
      if (runInFlightRef.current) {
        return;
      }
      const resolvedTrigger =
        triggerNode?.type === 'trigger'
          ? triggerNode
          : lastTriggerNodeIdRef.current
            ? normalizedNodes.find(
              (node: AiNode): boolean => node.id === lastTriggerNodeIdRef.current
            )
            : normalizedNodes.find((node: AiNode): boolean => node.type === 'trigger');
      if (!resolvedTrigger) {
        toast('Select a Trigger node to step the run.', { variant: 'info' });
        return;
      }
      void runGraphForTrigger(resolvedTrigger, undefined, undefined, { mode: 'step' });
    },
    [
      appendRuntimeEvent,
      finalizeLocalRunOutcome,
      normalizedNodes,
      processQueuedRuns,
      runGraphForTrigger,
      runLocalLoop,
      toast,
      updateRunStatus,
    ]
  );

  const cancelRun = useCallback((): void => {
    if (!runInFlightRef.current && runStatusRef.current !== 'paused') return;
    if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
      abortControllerRef.current.abort();
    }
    if (runStatusRef.current === 'paused') {
      runInFlightRef.current = false;
      updateRunStatus('idle');
      abortControllerRef.current = null;
      pauseRequestedRef.current = false;
      settleTransientNodeStatuses('canceled');
      appendRuntimeEvent({
        source: 'local',
        kind: 'run_canceled',
        level: 'info',
        runId: currentRunIdRef.current ?? null,
        runStartedAt: currentRunStartedAtRef.current ?? runtimeStateRef.current.runStartedAt ?? null,
        message: 'Run cancelled.',
      });
      toast('Run cancelled.', { variant: 'info' });
      processQueuedRuns();
    }
  }, [appendRuntimeEvent, processQueuedRuns, settleTransientNodeStatuses, toast, updateRunStatus]);

  const runPollUpdate = useCallback(
    async (
      node: AiNode,
      options: {
        jobId?: string;
        nodeInputs: RuntimePortValues;
      }
    ): Promise<void> => {
      const abortSignal = abortControllerRef.current?.signal;
      const fallbackJobId = options.jobId;
      const pollKey = `${node.id}:${options.jobId ?? 'db'}`;
      if (pollInFlightRef.current.has(pollKey)) return;
      pollInFlightRef.current.add(pollKey);
      try {
        if (abortSignal?.aborted) return;
        const pollConfig = node.config?.poll;
        const pollMode = pollConfig?.mode ?? 'job';
        let pollOutput: RuntimePortValues | null = null;
        if (pollMode === 'database') {
          const queryConfig: DbQueryConfig = {
            ...DEFAULT_DB_QUERY,
            ...(pollConfig?.dbQuery ?? {}),
          };
          const response = await pollDatabaseQuery(options.nodeInputs, {
            intervalMs: pollConfig?.intervalMs ?? 2000,
            maxAttempts: pollConfig?.maxAttempts ?? 30,
            dbQuery: queryConfig,
            successPath: pollConfig?.successPath ?? 'status',
            successOperator: pollConfig?.successOperator ?? 'equals',
            successValue: pollConfig?.successValue ?? 'completed',
            resultPath: pollConfig?.resultPath ?? 'result',
          }, abortSignal ? { signal: abortSignal } : {});
          pollOutput = {
            result: response.result,
            status: response.status,
            bundle: response.bundle,
          };
        } else {
          const jobId = options.jobId ?? '';
          if (!jobId) {
            return;
          }
          const result = await pollGraphJob(jobId, {
            intervalMs: pollConfig?.intervalMs ?? 2000,
            maxAttempts: pollConfig?.maxAttempts ?? 30,
            ...(abortSignal ? { signal: abortSignal } : {}),
          });

          pollOutput = {
            result,
            status: 'completed',
            jobId,
            bundle: { jobId, status: 'completed', result },
          };
        }
        const resolvedJobId =
          typeof (pollOutput as Record<string, unknown> | null)?.['jobId'] === 'string'
            ? ((pollOutput as Record<string, unknown>)['jobId'] as string)
            : fallbackJobId;
        const updatedOutputs: Record<string, RuntimePortValues> = {
          ...runtimeStateRef.current.outputs,
          [node.id]: pollOutput ?? runtimeStateRef.current.outputs[node.id] ?? {},
        };
        if (resolvedJobId) {
          normalizedNodes
            .filter((item: AiNode): boolean => item.type === 'model')
            .forEach((modelNode: AiNode) => {
              const modelOutput = updatedOutputs[modelNode.id] as
                | { jobId?: string; status?: string; result?: unknown; debugPayload?: unknown }
                | undefined;
              if ((modelOutput as Record<string, unknown> | undefined)?.['jobId'] !== resolvedJobId) return;
              updatedOutputs[modelNode.id] = {
                ...modelOutput,
                status: (pollOutput as Record<string, unknown> | null)?.['status'] as string ?? 'completed',
                result:
                  (pollOutput as Record<string, unknown> | null)?.['result'] !== undefined ? (pollOutput as Record<string, unknown>)['result'] : (modelOutput as Record<string, unknown> | undefined)?.['result'],
              } as RuntimePortValues;
            });
        }
        setRuntimeState((prev: RuntimeState): RuntimeState => ({
          ...prev,
          outputs: updatedOutputs,
        }));
        const runId =
          runtimeStateRef.current.runId ?? currentRunIdRef.current ?? undefined;
        const runStartedAt =
          runtimeStateRef.current.runStartedAt ??
          currentRunStartedAtRef.current ??
          undefined;
        const triggerNodeId = lastTriggerNodeIdRef.current ?? undefined;
        const seededOutputs = updatedOutputs;
        const downstreamState = await evaluateGraph({
          nodes: normalizedNodes,
          edges: sanitizedEdges,
          activePathId,
          activePathName: pathName,
          ...(runId ? { runId } : {}),
          ...(runStartedAt ? { runStartedAt } : {}),
          ...(triggerNodeId ? { triggerNodeId } : {}),
          triggerContext: triggerContextRef.current,
          deferPoll: true,
          skipAiJobs: true,
          seedOutputs: seededOutputs,
          seedHashes: runtimeStateRef.current.hashes ?? undefined,
          seedHashTimestamps: runtimeStateRef.current.hashTimestamps ?? undefined,
          seedHistory: runtimeStateRef.current.history ?? undefined,
          seedRunId: runtimeStateRef.current.runId ?? undefined,
          seedRunStartedAt: runtimeStateRef.current.runStartedAt ?? undefined,
          recordHistory: true,
          historyLimit: 50,
          fetchEntityByType,
          reportAiPathsError,
          toast,
          control: abortSignal ? { signal: abortSignal } : undefined,
        });
        const runAt = new Date().toISOString();
        setRuntimeState(downstreamState);
        setLastRunAt(runAt);
        void persistDebugSnapshot(activePathId ?? null, runAt, downstreamState);
        if (activePathId) {
          setPathConfigs((prev: Record<string, PathConfig>) => ({
            ...prev,
            [activePathId]: {
              ...(prev[activePathId] ?? buildActivePathConfig(runAt)),
              runtimeState: downstreamState,
              lastRunAt: runAt,
            },
          }));
        }

        // If the poll completion caused an Iterator to advance, start the next iteration (launch AI jobs).
        const shouldContinueIterators = normalizedNodes.some((n: AiNode): boolean => {
          if (n.type !== 'iterator') return false;
          if (n.config?.iterator?.autoContinue === false) return false;
          const status = (downstreamState.outputs[n.id] as Record<string, unknown> | undefined)?.['status'];
          return status === 'advance_pending';
        });
        if (shouldContinueIterators && !iteratorContinueInFlightRef.current) {
          iteratorContinueInFlightRef.current = true;
          try {
            const triggerNodeId = lastTriggerNodeIdRef.current ?? undefined;
            const continued = await evaluateGraphWithIteratorAutoContinue({
              nodes: normalizedNodes,
              edges: sanitizedEdges,
              activePathId,
              activePathName: pathName,
              ...(runId ? { runId } : {}),
              ...(runStartedAt ? { runStartedAt } : {}),
              ...(triggerNodeId ? { triggerNodeId } : {}),
              triggerContext: triggerContextRef.current,
              deferPoll: true,
              recordHistory: true,
              historyLimit: 50,
              seedOutputs: downstreamState.outputs,
              seedHashes: downstreamState.hashes ?? undefined,
              seedHashTimestamps: downstreamState.hashTimestamps ?? undefined,
              seedHistory: downstreamState.history ?? undefined,
              seedRunId: downstreamState.runId ?? runtimeStateRef.current.runId ?? undefined,
              seedRunStartedAt: downstreamState.runStartedAt ?? runtimeStateRef.current.runStartedAt ?? undefined,
              fetchEntityByType,
              reportAiPathsError,
              toast,
              control: abortSignal ? { signal: abortSignal } : undefined,
            });
            const continuedAt = new Date().toISOString();
            setRuntimeState(continued);
            setLastRunAt(continuedAt);
            void persistDebugSnapshot(activePathId ?? null, continuedAt, continued);
            if (activePathId) {
              setPathConfigs((prev: Record<string, PathConfig>) => ({
                ...prev,
                [activePathId]: {
                  ...(prev[activePathId] ?? buildActivePathConfig(continuedAt)),
                  runtimeState: continued,
                  lastRunAt: continuedAt,
                },
              }));
            }
          } finally {
            iteratorContinueInFlightRef.current = false;
          }
        }
      } catch (error) {
        if (abortSignal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return;
        }
        reportAiPathsError(
          error,
          { action: 'pollJob', nodeId: node.id, jobId: fallbackJobId },
          'AI job polling failed:'
        );
        setRuntimeState((prev: RuntimeState): RuntimeState => ({
          ...prev,
          outputs: {
            ...prev.outputs,
            [node.id]: {
              result: null,
              status: 'failed',
              jobId: fallbackJobId,
              bundle: {
                jobId: fallbackJobId,
                status: 'failed',
                error: error instanceof Error ? error.message : 'Polling failed',
              },
            },
          },
        }));
      } finally {
        pollInFlightRef.current.delete(pollKey);
      }
    },
    [
      normalizedNodes,
      sanitizedEdges,
      activePathId,
      pathName,
      fetchEntityByType,
      reportAiPathsError,
      toast,
      persistDebugSnapshot,
      buildActivePathConfig,
      setPathConfigs,
      setRuntimeState,
      setLastRunAt,
    ]
  );

  const startPendingPolls = useCallback(
    (state: RuntimeState): void => {
      normalizedNodes
        .filter((node: AiNode): boolean => node.type === 'poll')
        .forEach((node: AiNode) => {
          const pollConfig = node.config?.poll;
          const output = state.outputs[node.id] as
            | Record<string, unknown>
            | undefined;
          const nodeInputs = (state.inputs[node.id] ?? {}) as Record<string, unknown>;
          const inputJobId = coerceInput(nodeInputs['jobId']);
          const jobId =
            (output?.['jobId'] as string | undefined) ??
            (typeof inputJobId === 'string' || typeof inputJobId === 'number'
              ? String(inputJobId).trim()
              : '');
          const status = (output?.['status'] as string | undefined) ?? 'polling';
          if (status === 'completed' || status === 'failed') return;
          if (pollConfig?.mode !== 'database' && !jobId) return;
          void runPollUpdate(node, { jobId, nodeInputs });
        });
    },
    [normalizedNodes, runPollUpdate]
  );

  useEffect((): void => {
    if (executionMode !== 'local') return;
    if (serverRunActiveRef.current) return;
    if (!runtimeState || normalizedNodes.length === 0) return;
    startPendingPolls(runtimeState);
  }, [executionMode, normalizedNodes, runtimeState, startPendingPolls]);

  const dispatchTrigger = (eventName: string, entityId: string, entityType?: string): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
      new CustomEvent('ai-path-trigger', {
        detail: {
          trigger: eventName,
          productId: entityId,
          entityId,
          entityType: entityType ?? 'product',
        },
      })
    );
  };

  const handleRunSimulation = useCallback(
    async (simulationNode: AiNode, triggerEvent?: string): Promise<void> => {
      const entityId =
        simulationNode.config?.simulation?.entityId?.trim() ||
        simulationNode.config?.simulation?.productId?.trim();
      const entityType =
        normalizeEntityType(simulationNode.config?.simulation?.entityType) ?? 'product';
      if (!entityId) {
        toast('Enter an Entity ID in the simulation node.', { variant: 'error' });
        return;
      }
      const initialContext = buildSimulationContext(entityId, entityType, null);
      pendingSimulationContextRef.current = {
        ...(pendingSimulationContextRef.current ?? {}),
        ...initialContext,
      };
      seedSimulationRuntimeState(simulationNode, initialContext);

      const enrichContext = async (): Promise<Record<string, unknown> | null> => {
        const entity = await fetchEntityByType(entityType, entityId);
        if (!entity) return null;
        const enrichedContext = buildSimulationContext(entityId, entityType, entity);
        seedSimulationRuntimeState(simulationNode, enrichedContext);
        return enrichedContext;
      };

      let eventName = triggerEvent ?? TRIGGER_EVENTS[0]?.id ?? 'manual';
      if (!triggerEvent) {
        const adjacency = new Map<string, Set<string>>();
        sanitizedEdges.forEach((edge: Edge) => {
          if (!edge.from || !edge.to) return;
          const fromSet = adjacency.get(edge.from) ?? new Set<string>();
          fromSet.add(edge.to);
          adjacency.set(edge.from, fromSet);
          const toSet = adjacency.get(edge.to) ?? new Set<string>();
          toSet.add(edge.from);
          adjacency.set(edge.to, toSet);
        });
        const connected = new Set<string>();
        const queue = [simulationNode.id];
        connected.add(simulationNode.id);
        while (queue.length) {
          const current = queue.shift();
          if (!current) continue;
          const neighbors = adjacency.get(current);
          if (!neighbors) continue;
          neighbors.forEach((neighbor: string) => {
            if (connected.has(neighbor)) return;
            connected.add(neighbor);
            queue.push(neighbor);
          });
        }
        const connectedTriggerIds = normalizedNodes
          .filter((node: AiNode): boolean => node.type === 'trigger' && connected.has(node.id))
          .map((node: AiNode) => node.id);
        let triggerNode = normalizedNodes.find(
          (node: AiNode): boolean =>
            node.type === 'trigger' && connectedTriggerIds.includes(node.id)
        );
        if (!triggerNode) {
          const triggerCandidates = normalizedNodes.filter((node: AiNode): boolean => node.type === 'trigger');
          if (triggerCandidates.length === 1) {
            triggerNode = triggerCandidates[0];
            toast('No Trigger node connected; using the only Trigger in this path.', {
              variant: 'info',
            });
          }
        }
        if (!triggerNode) {
          toast('Connect a Trigger node to run the simulation.', { variant: 'error' });
          pendingSimulationContextRef.current = null;
          return;
        }
        const enrichedContext = await enrichContext();
        const simulationContext = enrichedContext ?? initialContext;
        pendingSimulationContextRef.current = {
          ...(pendingSimulationContextRef.current ?? {}),
          ...simulationContext,
        };
        eventName = triggerNode.config?.trigger?.event ?? eventName;
        await runGraphForTrigger(triggerNode, undefined, simulationContext);
        dispatchTrigger(eventName, entityId, entityType);
        if (!enrichedContext) {
          toast(`No entity found for ${entityType} ${entityId}. Using fallback context.`, {
            variant: 'info',
          });
        }
      } else {
        // Await enrichment so real entity data is available before the engine runs.
        // Timeout prevents indefinite blocking if the fetch hangs.
        const ENRICHMENT_TIMEOUT_MS = 3000;
        let enrichedContext: Record<string, unknown> | null = null;
        try {
          enrichedContext = await Promise.race([
            enrichContext(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), ENRICHMENT_TIMEOUT_MS)),
          ]);
        } catch {
          // Enrichment failed; fall through to use initialContext (fallback entity).
        }
        if (enrichedContext) {
          pendingSimulationContextRef.current = {
            ...(pendingSimulationContextRef.current ?? {}),
            ...enrichedContext,
          };
        }
        dispatchTrigger(eventName, entityId, entityType);
      }
      toast(`Simulated ${eventName} for ${entityType} ${entityId}`, {
        variant: 'success',
      });
    },
    [
      buildSimulationContext,
      sanitizedEdges,
      seedSimulationRuntimeState,
      fetchEntityByType,
      normalizedNodes,
      runGraphForTrigger,
      toast,
    ]
  );

  const handleFireTrigger = (triggerNode: AiNode, event?: React.MouseEvent): void => {
    if (executionMode === 'server') {
      void handleFireTriggerPersistent(triggerNode, event);
      return;
    }
    void (async (): Promise<void> => {
      const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
      const isScheduled = triggerEvent === 'scheduled_run';
      const adjacency = new Map<string, Set<string>>();
      sanitizedEdges.forEach((edge: Edge) => {
        if (!edge.from || !edge.to) return;
        const fromSet = adjacency.get(edge.from) ?? new Set<string>();
        fromSet.add(edge.to);
        adjacency.set(edge.from, fromSet);
        const toSet = adjacency.get(edge.to) ?? new Set<string>();
        toSet.add(edge.from);
        adjacency.set(edge.to, toSet);
      });
      const connected = new Set<string>();
      const queue = [triggerNode.id];
      connected.add(triggerNode.id);
      while (queue.length) {
        const current = queue.shift();
        if (!current) continue;
        const neighbors = adjacency.get(current);
        if (!neighbors) continue;
        neighbors.forEach((neighbor: string) => {
          if (connected.has(neighbor)) return;
          connected.add(neighbor);
          queue.push(neighbor);
        });
      }
      const connectedSimulationIds = normalizedNodes
        .filter((node: AiNode): boolean => node.type === 'simulation' && connected.has(node.id))
        .map((node: AiNode) => node.id);
      let simulationNodes = normalizedNodes.filter(
        (node: AiNode): boolean =>
          node.type === 'simulation' && connectedSimulationIds.includes(node.id)
      );
      if (simulationNodes.length === 0) {
        const fallbackSimulationNodes = normalizedNodes.filter(
          (node: AiNode): boolean => node.type === 'simulation'
        );
        if (fallbackSimulationNodes.length === 1) {
          if (!isScheduled) {
            toast('Simulation node isn\'t wired to the trigger. Using it anyway.', {
              variant: 'info',
            });
          }
          simulationNodes = fallbackSimulationNodes;
        } else if (!isScheduled) {
          toast('Connect a Simulation node to the Trigger context input.', {
            variant: 'error',
          });
          return;
        }
      }
      if (simulationNodes.length === 0) {
        await runGraphForTrigger(triggerNode, event);
        return;
      }
      for (const node of simulationNodes) {
        await handleRunSimulation(node, triggerEvent);
      }
      await runGraphForTrigger(triggerNode, event, pendingSimulationContextRef.current ?? undefined);
    })();
  };

  const handleFireTriggerPersistent = async (
    triggerNode: AiNode,
    event?: React.MouseEvent
  ): Promise<void> => {
    emitGraphIntegrityWarnings('server');
    toast('Queuing run…', { variant: 'info' });
    appendRuntimeEvent({
      source: 'server',
      kind: 'log',
      level: 'info',
      message: 'Queuing server run.',
    });
    const triggerEvent = triggerNode.config?.trigger?.event ?? TRIGGER_EVENTS[0]?.id;
    const isScheduled = triggerEvent === 'scheduled_run';
    const adjacency = new Map<string, Set<string>>();
    sanitizedEdges.forEach((edge: Edge) => {
      if (!edge.from || !edge.to) return;
      const fromSet = adjacency.get(edge.from) ?? new Set<string>();
      fromSet.add(edge.to);
      adjacency.set(edge.from, fromSet);
      const toSet = adjacency.get(edge.to) ?? new Set<string>();
      toSet.add(edge.from);
      adjacency.set(edge.to, toSet);
    });
    const connected = new Set<string>();
    const queue = [triggerNode.id];
    connected.add(triggerNode.id);
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      const neighbors = adjacency.get(current);
      if (!neighbors) continue;
      neighbors.forEach((neighbor: string) => {
        if (connected.has(neighbor)) return;
        connected.add(neighbor);
        queue.push(neighbor);
      });
    }
    const connectedSimulationIds = normalizedNodes
      .filter((node: AiNode): boolean => node.type === 'simulation' && connected.has(node.id))
      .map((node: AiNode) => node.id);
    let simulationNodes = normalizedNodes.filter(
      (node: AiNode): boolean =>
        node.type === 'simulation' && connectedSimulationIds.includes(node.id)
    );
    if (simulationNodes.length === 0) {
      const fallbackSimulationNodes = normalizedNodes.filter(
        (node: AiNode): boolean => node.type === 'simulation'
      );
      if (fallbackSimulationNodes.length === 1) {
        if (!isScheduled) {
          toast('Simulation node isn\'t wired to the trigger. Using it anyway.', {
            variant: 'info',
          });
        }
        simulationNodes = fallbackSimulationNodes;
      } else if (!isScheduled) {
        toast('Connect a Simulation node to the Trigger context input.', {
          variant: 'error',
        });
        return;
      }
    }
    if (simulationNodes.length === 0) {
      const triggerContext = buildTriggerContext(triggerNode, triggerEvent ?? '', event);
      const enqueueResult = await runsApi.enqueue({
        pathId: activePathId ?? 'default',
        pathName,
        nodes: normalizedNodes,
        edges: sanitizedEdges,
        ...(triggerEvent ? { triggerEvent } : {}),
        triggerNodeId: triggerNode.id,
        triggerContext,
        meta: {
          source: 'ai_paths_ui',
        },
      });
      if (!enqueueResult.ok) {
        appendRuntimeEvent({
          source: 'server',
          kind: 'run_failed',
          level: 'error',
          message: enqueueResult.error || 'Failed to enqueue persistent run.',
        });
        toast(enqueueResult.error || 'Failed to enqueue persistent run.', {
          variant: 'error',
        });
        return;
      }
      const run = (enqueueResult.data as { run?: AiPathRunRecord } | undefined)?.run;
      if (run?.id) {
        currentRunIdRef.current = run.id;
        const startedAt = toIsoString(run.startedAt);
        if (startedAt) {
          currentRunStartedAtRef.current = startedAt;
        }
        startServerRunStream(run.id);
        if (run.runtimeState) {
          applyServerRunUpdate(run);
        }
        setNodeStatus({
          nodeId: triggerNode.id,
          status: 'queued',
          source: 'server',
          runId: run.id,
          runStartedAt: startedAt ?? null,
          nodeType: triggerNode.type,
          nodeTitle: triggerNode.title ?? null,
          kind: 'node_status',
          message: `Node ${triggerNode.title ?? triggerNode.id} queued.`,
        });
      }
      toast('Persistent run queued.', { variant: 'success' });
      return;
    }
    const primarySimulation = simulationNodes[0]!;
    const entityId =
      primarySimulation.config?.simulation?.entityId?.trim() ||
      primarySimulation.config?.simulation?.productId?.trim() ||
      '';
    const entityType = primarySimulation.config?.simulation?.entityType?.trim() || 'product';
    if (!entityId) {
      toast('Simulation node is missing an Entity ID.', { variant: 'error' });
      return;
    }
    const triggerContext = {
      ...buildTriggerContext(triggerNode, triggerEvent ?? '', event),
      entityId,
      entityType,
    };
    const enqueueResult = await runsApi.enqueue({
      pathId: activePathId ?? 'default',
      pathName,
      nodes: normalizedNodes,
      edges: sanitizedEdges,
      ...(triggerEvent ? { triggerEvent } : {}),
      triggerNodeId: triggerNode.id,
      triggerContext,
      entityId,
      entityType,
      meta: {
        source: 'ai_paths_ui',
      },
    });
    if (!enqueueResult.ok) {
      appendRuntimeEvent({
        source: 'server',
        kind: 'run_failed',
        level: 'error',
        message: enqueueResult.error || 'Failed to enqueue persistent run.',
      });
      toast(enqueueResult.error || 'Failed to enqueue persistent run.', {
        variant: 'error',
      });
      return;
    }
    const run = (enqueueResult.data as { run?: AiPathRunRecord } | undefined)?.run;
    if (run?.id) {
      currentRunIdRef.current = run.id;
      const startedAt = toIsoString(run.startedAt);
      if (startedAt) {
        currentRunStartedAtRef.current = startedAt;
      }
      startServerRunStream(run.id);
      if (run.runtimeState) {
        applyServerRunUpdate(run);
      }
      setNodeStatus({
        nodeId: triggerNode.id,
        status: 'queued',
        source: 'server',
        runId: run.id,
        runStartedAt: startedAt ?? null,
        nodeType: triggerNode.type,
        nodeTitle: triggerNode.title ?? null,
        kind: 'node_status',
        message: `Node ${triggerNode.title ?? triggerNode.id} queued.`,
      });
    }
    toast('Persistent run queued.', { variant: 'success' });
  };

  const handleSendToAi = async (sourceNodeId: string, prompt: string): Promise<void> => {
    // Find the source node to determine its type
    const sourceNode = normalizedNodes.find((n: AiNode): boolean => n.id === sourceNodeId);
    if (!sourceNode) {
      toast('Source node not found.', { variant: 'error' });
      return;
    }

    // Find the connected AI Model node
    // For database nodes, prefer aiPrompt port; for prompt nodes, prefer prompt port; but accept any connection to a model
    const preferredPort =
      sourceNode.type === 'database' || sourceNode.type === 'regex'
        ? 'aiPrompt'
        : 'prompt';

    // First try to find edge with preferred port
    let aiEdge = sanitizedEdges.find(
      (edge: Edge): boolean => edge.from === sourceNodeId && edge.fromPort === preferredPort
    );

    // If not found, find any edge that connects to a model node
    if (!aiEdge) {
      aiEdge = sanitizedEdges.find((edge: Edge): boolean => {
        if (edge.from !== sourceNodeId) return false;
        const targetNode = normalizedNodes.find((n: AiNode): boolean => n.id === edge.to);
        return targetNode?.type === 'model';
      });
    }

    if (!aiEdge) {
      toast('No AI Model connected.', { variant: 'error' });
      return;
    }
    const aiNode = normalizedNodes.find((n: AiNode): boolean => n.id === aiEdge.to && n.type === 'model');
    if (!aiNode) {
      toast('Connected node is not an AI Model.', { variant: 'error' });
      return;
    }
    const modelConfig = aiNode.config?.model ?? {
      modelId: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 800,
      vision: false,
    };
    const startedAt = new Date().toISOString();
    const startedAtMs = Date.now();
    let directJobId: string | null = null;
    setSendingToAi(true);
    try {
      const payload = {
        prompt: prompt.trim(),
        imageUrls: [],
        modelId: modelConfig.modelId,
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        vision: modelConfig.vision,
        source: 'ai_paths_direct',
        graph: {
          pathId: activePathId ?? undefined,
          nodeId: aiNode.id,
          nodeTitle: aiNode.title,
        },
      };
      const enqueueData = (await enqueueAiJobMutation.mutateAsync({
        productId: activePathId ?? 'direct',
        type: 'graph_model',
        payload,
      })) as { jobId: string };
      directJobId = enqueueData.jobId;
      toast('AI job queued. Waiting for result...', { variant: 'success' });
      const result = await pollGraphJob(enqueueData.jobId, {
        ...(abortControllerRef.current?.signal ? { signal: abortControllerRef.current.signal } : {}),
      });
      // Update runtime state with the result
      setRuntimeState((prev: RuntimeState): RuntimeState => {
        const sourceInputs = prev.inputs[sourceNodeId] ?? {};
        const sourceOutputs = prev.outputs[sourceNodeId] ?? {};
        const aiOutputs = prev.outputs[aiNode.id] ?? {};
        const now = new Date().toISOString();
        const resolvedRunId = prev.runId ?? currentRunIdRef.current ?? createRunId();
        const resolvedRunStartedAt =
          prev.runStartedAt ?? currentRunStartedAtRef.current ?? startedAt;
        const historyLimit = 50;

        // For database nodes, store result in queryCallback (both input and output)
        // For prompt nodes, store result in the result input (so it shows in the Result Input field)
        const updatedSourceOutputs =
          sourceNode.type === 'database'
            ? { ...sourceOutputs, queryCallback: result }
            : sourceNode.type === 'regex'
              ? { ...sourceOutputs, regexCallback: result }
              : sourceOutputs;

        const updatedSourceInputs =
          sourceNode.type === 'database'
            ? { ...sourceInputs, queryCallback: result }
            : sourceNode.type === 'prompt'
              ? { ...sourceInputs, result }
              : sourceNode.type === 'regex'
                ? { ...sourceInputs, regexCallback: result }
                : sourceInputs;

        const nextHistory: Record<string, RuntimeHistoryEntry[]> = prev.history
          ? { ...prev.history }
          : {};
        const pushHistory = (
          node: AiNode,
          inputs: RuntimePortValues,
          outputs: RuntimePortValues
        ): void => {
          const entry: RuntimeHistoryEntry = {
            timestamp: now,
            runId: resolvedRunId,
            runStartedAt: resolvedRunStartedAt,
            pathId: activePathId ?? null,
            pathName: pathName ?? null,
            nodeId: node.id,
            nodeType: node.type,
            nodeTitle: node.title ?? null,
            status: 'completed',
            iteration: 0,
            inputs,
            outputs,
          };
          const existing = nextHistory[node.id] ? [...nextHistory[node.id]!] : [];
          existing.push(entry);
          if (existing.length > historyLimit) {
            existing.splice(0, existing.length - historyLimit);
          }
          nextHistory[node.id] = existing;
        };
        pushHistory(sourceNode, updatedSourceInputs, updatedSourceOutputs);
        pushHistory(aiNode, {
          prompt: payload.prompt,
          modelId: modelConfig.modelId,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          vision: modelConfig.vision,
        }, {
          ...aiOutputs,
          result,
          jobId: enqueueData.jobId,
          status: 'completed',
        });

        return {
          ...prev,
          runId: resolvedRunId,
          runStartedAt: resolvedRunStartedAt,
          inputs: {
            ...prev.inputs,
            [sourceNodeId]: updatedSourceInputs,
          },
          outputs: {
            ...prev.outputs,
            [sourceNodeId]: updatedSourceOutputs,
            [aiNode.id]: {
              ...aiOutputs,
              result,
              jobId: enqueueData.jobId,
              status: 'completed',
            },
          },
          ...(Object.keys(nextHistory).length > 0 ? { history: nextHistory } : {}),
        };
      });
      toast('AI response received.', { variant: 'success' });
      void appendLocalRun({
        pathId: activePathId ?? null,
        pathName: pathName ?? null,
        triggerEvent: 'node_ai_prompt',
        triggerLabel: 'Node AI Prompt',
        status: 'success',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        nodeCount: 2,
        source: 'ai_paths_direct',
      });
    } catch (error) {
      reportAiPathsError(
        error,
        { action: 'sendToAi', nodeId: sourceNodeId },
        'Send to AI failed:'
      );
      toast('Send to AI failed.', { variant: 'error' });
      void appendLocalRun({
        pathId: activePathId ?? null,
        pathName: pathName ?? null,
        triggerEvent: 'node_ai_prompt',
        triggerLabel: 'Node AI Prompt',
        status: 'error',
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startedAtMs,
        nodeCount: 2,
        error: error instanceof Error ? error.message : 'Send to AI failed',
        source: 'ai_paths_direct',
      });
    } finally {
      if (directJobId) {
        void fetch(`/api/products/ai-jobs/${encodeURIComponent(directJobId)}`, {
          method: 'DELETE',
        }).catch(() => undefined);
      }
      setSendingToAi(false);
    }
  };

  return {
    handleRunSimulation,
    handleFireTrigger,
    handleFireTriggerPersistent,
    handlePauseRun: pauseRun,
    handleResumeRun: resumeRun,
    handleStepRun: stepRun,
    handleCancelRun: cancelRun,
    runStatus,
    handleSendToAi,
    sendingToAi,
    runtimeNodeStatuses,
    runtimeEvents,
    clearNodeCache,
  };
}
