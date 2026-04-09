import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, AiPathRunRecord, Edge, RuntimeState } from '@/shared/contracts/ai-paths';

const {
  evaluateRunPreflightMock,
  normalizeAiPathsValidationConfigMock,
  getBrainAssignmentForCapabilityMock,
  listBrainModelsMock,
  createRunEventMock,
} = vi.hoisted(() => ({
  evaluateRunPreflightMock: vi.fn(),
  normalizeAiPathsValidationConfigMock: vi.fn(),
  getBrainAssignmentForCapabilityMock: vi.fn(),
  listBrainModelsMock: vi.fn(),
  createRunEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/core/utils/run-preflight', () => ({
  evaluateRunPreflight: evaluateRunPreflightMock,
}));

vi.mock('@/shared/lib/ai-paths/core/validation-engine/defaults', () => ({
  normalizeAiPathsValidationConfig: normalizeAiPathsValidationConfigMock,
}));

vi.mock('@/shared/lib/ai-brain/segments/api', () => ({
  getBrainAssignmentForCapability: getBrainAssignmentForCapabilityMock,
}));

vi.mock('@/shared/lib/ai-brain/server-model-catalog', () => ({
  listBrainModels: listBrainModelsMock,
}));

import { runExecutorPreflight } from '../path-run-executor/preflight';

const RUNTIME_STATE_IDLE: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  currentRun: null,
  inputs: {},
  outputs: {},
};

const buildRunRecord = (): AiPathRunRecord =>
  ({
    id: 'run_preflight_vision',
    createdAt: '2026-04-09T10:00:00.000Z',
    updatedAt: '2026-04-09T10:00:00.000Z',
    status: 'queued',
    pathId: 'path_vision_preflight',
    pathName: 'Vision Preflight',
    triggerNodeId: null,
    triggerEvent: 'manual',
    triggerContext: null,
    error: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    finishedAt: null,
    deadLetteredAt: null,
    retryCount: null,
    maxAttempts: null,
    nextRetryAt: null,
    meta: {},
    entityId: null,
    entityType: null,
    graph: { nodes: [], edges: [] },
    runtimeState: null,
  }) as AiPathRunRecord;

const buildModelNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-model-1',
    type: 'model',
    title: 'Normalize Model',
    position: { x: 0, y: 0 },
    inputs: ['prompt', 'images'],
    outputs: ['result', 'jobId'],
    createdAt: '2026-04-09T10:00:00.000Z',
    updatedAt: null,
    config: {
      model: {
        modelId: '',
        temperature: 0.1,
        maxTokens: 900,
        vision: true,
        waitForResult: true,
      },
    },
    ...patch,
  }) as AiNode;

const NON_BLOCKING_PREFLIGHT = {
  shouldBlock: false,
  blockReason: null,
  blockMessage: null,
  nodeValidationEnabled: true,
  validationReport: {
    enabled: true,
    blocked: false,
    shouldWarn: false,
    score: 100,
    failedRules: 0,
    warnThreshold: 80,
    blockThreshold: 50,
    findings: [],
    policy: 'warn',
  },
  compileReport: {
    ok: true,
    errors: 0,
    warnings: 0,
    findings: [],
    processingNodeIds: [],
  },
  dependencyReport: null,
  dataContractReport: {
    errors: 0,
    warnings: 0,
    issues: [],
  },
  warnings: [],
};

describe('runExecutorPreflight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    normalizeAiPathsValidationConfigMock.mockReturnValue({
      enabled: true,
      rules: [],
    });
    evaluateRunPreflightMock.mockReturnValue(NON_BLOCKING_PREFLIGHT);
    getBrainAssignmentForCapabilityMock.mockResolvedValue({
      enabled: true,
      provider: 'model',
      modelId: 'brain-default-text',
      agentId: '',
      notes: null,
    });
    listBrainModelsMock.mockResolvedValue({
      models: ['brain-default-text', 'vision-model'],
      descriptors: {
        'brain-default-text': {
          id: 'brain-default-text',
          family: 'chat',
          modality: 'text',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
        'vision-model': {
          id: 'vision-model',
          family: 'vision_extract',
          modality: 'multimodal',
          vendor: 'openai',
          supportsStreaming: true,
          supportsJsonMode: true,
        },
      },
    });
    createRunEventMock.mockResolvedValue(undefined);
  });

  it('blocks when a vision-enabled model node resolves to a text-only AI Brain model', async () => {
    const run = buildRunRecord();
    const nodes = [buildModelNode()];

    await expect(
      runExecutorPreflight({
        run,
        nodes,
        edges: [] as Edge[],
        triggerNodeId: null,
        runtimeState: RUNTIME_STATE_IDLE,
        repo: {
          createRunEvent: createRunEventMock,
        } as never,
        runStartedAt: '2026-04-09T10:00:05.000Z',
        traceId: 'trace-vision-preflight',
      })
    ).rejects.toThrow(/Accepts Images enabled/i);

    expect(createRunEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: run.id,
        level: 'error',
        message: 'Run blocked by AI Brain model capability preflight.',
      })
    );
  });

  it('passes when a vision-enabled model node resolves to a multimodal model', async () => {
    const run = buildRunRecord();
    const nodes = [
      buildModelNode({
        config: {
          model: {
            modelId: 'vision-model',
            temperature: 0.1,
            maxTokens: 900,
            vision: true,
            waitForResult: true,
          },
        },
      }),
    ];

    const result = await runExecutorPreflight({
      run,
      nodes,
      edges: [] as Edge[],
      triggerNodeId: null,
      runtimeState: RUNTIME_STATE_IDLE,
      repo: {
        createRunEvent: createRunEventMock,
      } as never,
      runStartedAt: '2026-04-09T10:00:05.000Z',
      traceId: 'trace-vision-pass',
    });

    expect(result.requiredProcessingNodeIds).toEqual([]);
    expect(createRunEventMock).not.toHaveBeenCalled();
  });
});
