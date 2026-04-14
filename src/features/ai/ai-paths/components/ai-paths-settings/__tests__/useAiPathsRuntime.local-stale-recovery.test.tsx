import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RuntimeState } from '@/shared/contracts/ai-paths-runtime';

const {
  runtimeContextState,
  runtimeActionsMock,
  runtimeStateHook,
  localExecutionArgsState,
  serverExecutionState,
} = vi.hoisted(() => ({
  runtimeContextState: {
    runtimeState: {
      status: 'running',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: {
        id: 'run-stale',
        status: 'running',
        startedAt: '2026-04-10T12:00:00.000Z',
      },
      inputs: {},
      outputs: {},
      history: {},
      hashes: {},
      hashTimestamps: {},
    },
    parserSamples: {},
    updaterSamples: {},
    sendingToAi: false,
  },
  runtimeActionsMock: {
    setRuntimeState: vi.fn(),
    setLastRunAt: vi.fn(),
    setRuntimeRunStatus: vi.fn(),
    setRuntimeNodeStatuses: vi.fn(),
    setRuntimeEvents: vi.fn(),
    setNodeDurations: vi.fn(),
    setSendingToAi: vi.fn(),
    setCurrentRunId: vi.fn(),
  },
  runtimeStateHook: {
    runStatus: 'running' as const,
    runtimeNodeStatuses: {},
    runtimeEvents: [],
    nodeDurations: {},
    runtimeNodeStatusesRef: { current: {} },
    setRuntimeNodeStatuses: vi.fn(),
    appendRuntimeEvent: vi.fn(),
    setRunStatus: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    setRuntimeEvents: vi.fn(),
  },
  localExecutionArgsState: {
    current: null as Record<string, unknown> | null,
  },
  serverExecutionState: {
    serverRunActiveRef: { current: false },
    stopServerRunStream: vi.fn(),
  },
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeDataState: () => ({
    runtimeState: runtimeContextState.runtimeState,
    parserSamples: runtimeContextState.parserSamples,
    updaterSamples: runtimeContextState.updaterSamples,
  }),
  useRuntimeUiState: () => ({
    sendingToAi: runtimeContextState.sendingToAi,
  }),
  useRuntimeActions: () => runtimeActionsMock,
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => null,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: () => ({
    effectiveModelId: '',
    assignment: {
      enabled: false,
      provider: 'model',
    },
  }),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => ({
    models: [],
    descriptors: {},
    isLoading: false,
    assignment: {
      enabled: false,
      provider: 'model',
      modelId: '',
      agentId: '',
      notes: null,
    },
    effectiveModelId: '',
    sourceWarnings: [],
    refresh: vi.fn(),
  }),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  normalizeNodes: (nodes: unknown) => nodes,
  sanitizeEdges: (_nodes: unknown, edges: unknown) => edges,
  stableStringify: (value: unknown) => JSON.stringify(value),
  aiJobsApi: {
    enqueue: vi.fn(),
  },
}));

vi.mock('@/shared/lib/ai-paths/core/runtime/graph-model-job', () => ({
  buildGraphModelJobPayload: vi.fn(),
  buildQueuedGraphModelJobEnqueueRequest: vi.fn(),
  readEnqueuedGraphModelJobId: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/core/runtime/utils', () => ({
  pollGraphJob: vi.fn(),
}));

vi.mock('../edge-cardinality-repair', () => ({
  pruneSingleCardinalityIncomingEdges: (_nodes: unknown, edges: unknown) => ({ edges }),
}));

vi.mock('../runtime/useAiPathsRuntimeState', () => ({
  useAiPathsRuntimeState: () => runtimeStateHook,
}));

vi.mock('../runtime/useAiPathsLocalExecution', () => ({
  useAiPathsLocalExecution: (args: unknown) => {
    localExecutionArgsState.current = args as Record<string, unknown>;
    return {
      runGraphForTrigger: vi.fn(),
      runLocalLoop: vi.fn(),
    };
  },
}));

vi.mock('../runtime/useAiPathsSimulation', () => ({
  useAiPathsSimulation: () => ({
    fetchEntityByType: vi.fn(async () => null),
    handleRunSimulation: vi.fn(),
  }),
}));

vi.mock('../runtime/useAiPathsServerExecution', () => ({
  useAiPathsServerExecution: () => serverExecutionState,
}));

import { useAiPathsRuntime } from '../useAiPathsRuntime';

const buildArgs = (): Parameters<typeof useAiPathsRuntime>[0] =>
  ({
    activePathId: 'path-test',
    pathName: 'Test Path',
    pathDescription: '',
    activeTab: 'runtime',
    activeTrigger: 'manual',
    executionMode: 'local',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: false },
    runtimeKernelConfig: { mode: 'auto', nodeTypes: [], codeObjectResolverIds: [] },
    historyRetentionPasses: 5,
    isPathActive: true,
    nodes: [],
    edges: [],
    toast: vi.fn(),
    reportAiPathsError: vi.fn(),
  }) as Parameters<typeof useAiPathsRuntime>[0];

describe('useAiPathsRuntime local stale recovery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    runtimeContextState.runtimeState = {
      status: 'running',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: {
        id: 'run-stale',
        status: 'running',
        startedAt: '2026-04-10T12:00:00.000Z',
      },
      inputs: {},
      outputs: {},
      history: {},
      hashes: {},
      hashTimestamps: {},
    };
    runtimeStateHook.runStatus = 'running';
    runtimeStateHook.appendRuntimeEvent = vi.fn();
    runtimeStateHook.setRunStatus = vi.fn();
    serverExecutionState.serverRunActiveRef.current = false;
    serverExecutionState.stopServerRunStream = vi.fn();
    localExecutionArgsState.current = null;
    runtimeActionsMock.setRuntimeState.mockImplementation((
      updater: RuntimeState | ((prev: RuntimeState) => RuntimeState)
    ) => {
      runtimeContextState.runtimeState =
        typeof updater === 'function' ? updater(runtimeContextState.runtimeState) : updater;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers a stranded local running state and appends a recovery event', () => {
    renderHook(() => useAiPathsRuntime(buildArgs()));

    const localArgs = localExecutionArgsState.current as {
      runLoopActiveRef: { current: boolean };
      runInFlightRef: { current: boolean };
      currentRunIdRef: { current: string | null };
      currentRunStartedAtRef: { current: string | null };
      currentRunStartedAtMsRef: { current: number | null };
      triggerContextRef: { current: Record<string, unknown> | null };
      queuedRunsRef: { current: unknown[] };
      abortControllerRef: { current: AbortController | null };
      pauseRequestedRef: { current: boolean };
    };
    localArgs.runLoopActiveRef.current = false;
    localArgs.runInFlightRef.current = true;
    localArgs.currentRunIdRef.current = 'run-stale';
    localArgs.currentRunStartedAtRef.current = '2026-04-10T12:00:00.000Z';
    localArgs.currentRunStartedAtMsRef.current = Date.now() - 10_000;
    localArgs.triggerContextRef.current = { entityId: 'product-123' };
    localArgs.queuedRunsRef.current = [{ id: 'queued-1' }];

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(runtimeStateHook.setRunStatus).toHaveBeenCalledWith('idle');
    expect(runtimeActionsMock.setRuntimeRunStatus).toHaveBeenCalledWith('idle');
    expect(runtimeActionsMock.setCurrentRunId).toHaveBeenCalledWith(null);
    expect(runtimeStateHook.appendRuntimeEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'local',
        kind: 'run_warning',
        level: 'warn',
        message: 'Recovered a stale local run and reset runtime state to idle.',
      })
    );
    expect(localArgs.runInFlightRef.current).toBe(false);
    expect(localArgs.currentRunIdRef.current).toBeNull();
    expect(localArgs.currentRunStartedAtRef.current).toBeNull();
    expect(localArgs.currentRunStartedAtMsRef.current).toBeNull();
    expect(localArgs.triggerContextRef.current).toBeNull();
    expect(localArgs.queuedRunsRef.current).toEqual([]);
    expect(runtimeContextState.runtimeState.status).toBe('idle');
    expect(runtimeContextState.runtimeState.currentRun?.status).toBe('canceled');
  });

  it('does not recover while the local execution loop is still active', () => {
    renderHook(() => useAiPathsRuntime(buildArgs()));

    const localArgs = localExecutionArgsState.current as {
      runLoopActiveRef: { current: boolean };
      runInFlightRef: { current: boolean };
    };
    localArgs.runLoopActiveRef.current = true;
    localArgs.runInFlightRef.current = true;

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(runtimeStateHook.setRunStatus).not.toHaveBeenCalledWith('idle');
    expect(runtimeActionsMock.setRuntimeRunStatus).not.toHaveBeenCalledWith('idle');
    expect(runtimeStateHook.appendRuntimeEvent).not.toHaveBeenCalled();
    expect(localArgs.runInFlightRef.current).toBe(true);
  });
});
