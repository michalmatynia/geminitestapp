import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stopServerRunStreamFns = vi.hoisted((): Array<ReturnType<typeof vi.fn>> => []);

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeState: () => ({
    runtimeState: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {},
      history: {},
    },
    parserSamples: {},
    updaterSamples: {},
    sendingToAi: false,
  }),
  useRuntimeActions: () => ({
    setRuntimeState: vi.fn(),
    setLastRunAt: vi.fn(),
    setRuntimeRunStatus: vi.fn(),
    setRuntimeNodeStatuses: vi.fn(),
    setRuntimeEvents: vi.fn(),
    setNodeDurations: vi.fn(),
    setSendingToAi: vi.fn(),
    setCurrentRunId: vi.fn(),
  }),
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

vi.mock('@/features/ai/ai-paths/context/GraphContext', () => ({
  useGraphActions: () => ({
    setPathConfigs: vi.fn(),
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
  useAiPathsRuntimeState: () => ({
    runStatus: 'idle',
    runtimeNodeStatuses: {},
    runtimeEvents: [],
    nodeDurations: {},
    runtimeNodeStatusesRef: { current: {} },
    setRuntimeNodeStatuses: vi.fn(),
    appendRuntimeEvent: vi.fn(),
    setRunStatus: vi.fn(),
    resetRuntimeNodeStatuses: vi.fn(),
    setRuntimeEvents: vi.fn(),
  }),
}));

vi.mock('../runtime/useAiPathsLocalExecution', () => ({
  useAiPathsLocalExecution: () => ({
    runGraphForTrigger: vi.fn(),
    runLocalLoop: vi.fn(),
  }),
}));

vi.mock('../runtime/useAiPathsSimulation', () => ({
  useAiPathsSimulation: () => ({
    fetchEntityByType: vi.fn(async () => null),
    handleRunSimulation: vi.fn(),
  }),
}));

vi.mock('../runtime/useAiPathsServerExecution', () => ({
  useAiPathsServerExecution: () => {
    const stopServerRunStream = vi.fn();
    stopServerRunStreamFns.push(stopServerRunStream);
    return {
      serverRunActiveRef: { current: false },
      runServerStream: vi.fn(),
      stopServerRunStream,
    };
  },
}));

import { useAiPathsRuntime } from '../useAiPathsRuntime';

const buildArgs = (): Parameters<typeof useAiPathsRuntime>[0] =>
  ({
    activePathId: 'path-test',
    pathName: 'Test Path',
    pathDescription: '',
    activeTrigger: 'manual',
    executionMode: 'server',
    runMode: 'manual',
    strictFlowMode: true,
    blockedRunPolicy: 'fail_run',
    aiPathsValidation: { enabled: false },
    runtimeKernelConfig: { mode: 'auto', nodeTypes: [], codeObjectResolverIds: [] },
    historyRetentionPasses: 5,
    nodes: [],
    edges: [],
    toast: vi.fn(),
    reportAiPathsError: vi.fn(),
  }) as Parameters<typeof useAiPathsRuntime>[0];

describe('useAiPathsRuntime stream cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopServerRunStreamFns.length = 0;
  });

  it('does not stop the server run stream on a normal rerender', () => {
    const { rerender, unmount } = renderHook(() => useAiPathsRuntime(buildArgs()));

    expect(stopServerRunStreamFns).toHaveLength(1);
    expect(stopServerRunStreamFns[0]).not.toHaveBeenCalled();

    rerender();

    expect(stopServerRunStreamFns).toHaveLength(2);
    expect(stopServerRunStreamFns[0]).not.toHaveBeenCalled();
    expect(stopServerRunStreamFns[1]).not.toHaveBeenCalled();

    unmount();

    expect(stopServerRunStreamFns[0]).not.toHaveBeenCalled();
    expect(stopServerRunStreamFns[1]).toHaveBeenCalledTimes(1);
  });
});
