import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';

const {
  runtimeContextState,
  runtimeActionsMock,
  brainAssignmentMock,
  brainModelOptionsMock,
  aiJobsEnqueueMock,
} = vi.hoisted(() => ({
  runtimeContextState: {
    runtimeState: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      currentRun: null,
      inputs: {},
      outputs: {
        'prompt-node': {
          value: 'Prompt preview',
        },
      },
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
  brainAssignmentMock: vi.fn(),
  brainModelOptionsMock: vi.fn(),
  aiJobsEnqueueMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context/RuntimeContext', () => ({
  useRuntimeState: () => runtimeContextState,
  useRuntimeActions: () => runtimeActionsMock,
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: () => null,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: () => brainAssignmentMock(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => brainModelOptionsMock(),
}));

vi.mock('@/shared/lib/ai-paths', () => ({
  normalizeNodes: (nodes: unknown) => nodes,
  sanitizeEdges: (_nodes: unknown, edges: unknown) => edges,
  stableStringify: (value: unknown) => JSON.stringify(value),
  aiJobsApi: {
    enqueue: (...args: unknown[]) => aiJobsEnqueueMock(...args),
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
  useAiPathsServerExecution: () => ({
    serverRunActiveRef: { current: false },
    runServerStream: vi.fn(),
    stopServerRunStream: vi.fn(),
  }),
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
    nodes: [
      {
        id: 'prompt-node',
        type: 'prompt',
        title: 'Prompt',
        description: '',
        inputs: ['value'],
        outputs: ['result'],
        position: { x: 0, y: 0 },
        data: {},
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: null,
      },
      {
        id: 'model-node',
        type: 'model',
        title: 'Vision Model',
        description: '',
        inputs: ['prompt', 'images'],
        outputs: ['result', 'jobId'],
        position: { x: 200, y: 0 },
        data: {},
        createdAt: '2026-04-09T00:00:00.000Z',
        updatedAt: null,
        config: {
          model: {
            modelId: '',
            temperature: 0.1,
            maxTokens: 800,
            vision: true,
            waitForResult: true,
          },
        },
      },
    ] as AiNode[],
    edges: [
      {
        id: 'edge-prompt-model',
        from: 'prompt-node',
        to: 'model-node',
        fromPort: 'result',
        toPort: 'prompt',
      },
    ] as Edge[],
    toast: vi.fn(),
    reportAiPathsError: vi.fn(),
  }) as Parameters<typeof useAiPathsRuntime>[0];

describe('useAiPathsRuntime handleSendToAi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    brainAssignmentMock.mockReturnValue({
      effectiveModelId: 'brain-default-text',
      assignment: {
        enabled: true,
        provider: 'model',
      },
    });
    brainModelOptionsMock.mockReturnValue({
      models: ['brain-default-text'],
      descriptors: {
        'brain-default-text': {
          id: 'brain-default-text',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
      isLoading: false,
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'brain-default-text',
        agentId: '',
        notes: null,
      },
      effectiveModelId: 'brain-default-text',
      sourceWarnings: [],
      refresh: vi.fn(),
    });
  });

  it('blocks preview execution when the effective Brain model is text-only and vision is enabled', async () => {
    const args = buildArgs();
    const { result } = renderHook(() => useAiPathsRuntime(args));

    await act(async () => {
      await result.current.handleSendToAi('prompt-node', 'Preview this');
    });

    expect(args.toast).toHaveBeenCalledWith(
      'Model node "Vision Model" has Accepts Images enabled but effective AI Brain model "brain-default-text" is text. Choose a multimodal model or disable image input for this node.',
      { variant: 'error' }
    );
    expect(aiJobsEnqueueMock).not.toHaveBeenCalled();
    expect(runtimeActionsMock.setSendingToAi).not.toHaveBeenCalled();
  });
});
