import { afterEach, describe, expect, it, vi } from 'vitest';

import { handleModel } from '@/shared/lib/ai-paths/core/runtime/handlers/generation';
import { aiJobsApi } from '@/shared/lib/ai-paths/api';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { AiNode, Edge, ModelConfig } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

vi.mock('@/shared/lib/ai-paths/api', async () => {
  const actual = await vi.importActual<typeof import('@/shared/lib/ai-paths/api')>(
    '@/shared/lib/ai-paths/api'
  );
  return {
    ...actual,
    aiJobsApi: {
      ...actual.aiJobsApi,
      enqueue: vi.fn(),
    },
  };
});

const buildModelNode = (
  patch: Partial<AiNode> = {},
  modelPatch: Partial<ModelConfig> = {}
): AiNode =>
  ({
    id: 'model-1',
    type: 'model',
    title: 'Model',
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['prompt', 'images'],
    outputs: ['result', 'jobId'],
    config: {
      model: {
        temperature: 0.2,
        maxTokens: 256,
        waitForResult: false,
        ...modelPatch,
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildPromptNode = (id: string, patch: Partial<AiNode> = {}): AiNode =>
  ({
    id,
    type: 'prompt',
    title: id,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['bundle', 'images', 'result'],
    outputs: ['prompt', 'images'],
    config: {
      prompt: {
        template: '',
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const createExecutedSets = () => ({
  notification: new Set<string>(),
  updater: new Set<string>(),
  http: new Set<string>(),
  delay: new Set<string>(),
  poll: new Set<string>(),
  ai: new Set<string>(),
  schema: new Set<string>(),
  mapper: new Set<string>(),
});

const buildContext = (input: {
  node: AiNode;
  nodes: AiNode[];
  edges: Edge[];
  nodeInputs?: RuntimePortValues;
  prevOutputs?: RuntimePortValues;
  allOutputs?: Record<string, RuntimePortValues>;
  allInputs?: Record<string, RuntimePortValues>;
  executedAiIds?: string[];
  contextRegistry?: ContextRegistryConsumerEnvelope | null;
}): NodeHandlerContext =>
  ({
    node: input.node,
    nodes: input.nodes,
    edges: input.edges,
    nodeById: new Map<string, AiNode>(input.nodes.map((node: AiNode) => [node.id, node])),
    nodeInputs: input.nodeInputs ?? {},
    prevOutputs: input.prevOutputs ?? {},
    runId: 'run-model-1',
    runStartedAt: '2026-02-23T00:00:00.000Z',
    activePathId: 'path-model',
    contextRegistry: input.contextRegistry ?? null,
    now: '2026-02-23T00:00:00.000Z',
    skipAiJobs: false,
    allOutputs: input.allOutputs ?? {},
    allInputs: input.allInputs ?? {},
    fetchEntityCached: async () => null,
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: (() => {
      const sets = createExecutedSets();
      (input.executedAiIds ?? []).forEach((nodeId: string): void => {
        sets.ai.add(nodeId);
      });
      return sets;
    })(),
  }) as NodeHandlerContext;

describe('handleModel prompt routing', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns previous outputs when node was already executed before prompt checks', async () => {
    const modelNode = buildModelNode();
    const prevOutputs: RuntimePortValues = {
      status: 'completed',
      result: 'cached result',
      jobId: 'job-previous',
    };
    const context = buildContext({
      node: modelNode,
      nodes: [modelNode],
      edges: [],
      prevOutputs,
      executedAiIds: [modelNode.id],
    });

    const result = await handleModel(context);

    expect(result).toEqual(prevOutputs);
    expect(vi.mocked(aiJobsApi.enqueue)).not.toHaveBeenCalled();
  });

  it('selects prompt from any connected prompt source instead of blocking on first empty source', async () => {
    vi.mocked(aiJobsApi.enqueue).mockResolvedValueOnce({
      ok: true,
      data: { jobId: 'job-queued-1' },
    } as Awaited<ReturnType<typeof aiJobsApi.enqueue>>);

    const modelNode = buildModelNode();
    const promptA = buildPromptNode('prompt-a');
    const promptB = buildPromptNode('prompt-b');
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'prompt-a',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
      {
        id: 'edge-b',
        from: 'prompt-b',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
    ];
    const context = buildContext({
      node: modelNode,
      nodes: [promptA, promptB, modelNode],
      edges,
      allOutputs: {
        'prompt-a': {
          status: 'blocked',
          blockedReason: 'missing_inputs',
          waitingOnPorts: ['bundle'],
        },
        'prompt-b': {
          prompt: 'Generate localized name and description.',
        },
      },
      allInputs: {
        'prompt-a': {},
        'prompt-b': {
          bundle: { id: 'product-1', title: 'Sword' },
        },
      },
    });

    const result = await handleModel(context);

    expect(result['status']).toBe('queued');
    expect(result['jobId']).toBe('job-queued-1');
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        prompt: 'Generate localized name and description.',
      })
    );
  });

  it('includes the node-selected modelId in the queued graph_model payload', async () => {
    vi.mocked(aiJobsApi.enqueue).mockResolvedValueOnce({
      ok: true,
      data: { jobId: 'job-queued-2' },
    } as Awaited<ReturnType<typeof aiJobsApi.enqueue>>);

    const modelNode = {
      ...buildModelNode(),
      config: {
        model: {
          modelId: 'gpt-4o-mini',
          temperature: 0.2,
          maxTokens: 256,
          waitForResult: false,
          vision: false,
        },
      },
    } as AiNode;
    const promptNode = buildPromptNode('prompt-node');
    const edges: Edge[] = [
      {
        id: 'edge-prompt',
        from: 'prompt-node',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
    ];
    const context = buildContext({
      node: modelNode,
      nodes: [promptNode, modelNode],
      edges,
      allOutputs: {
        'prompt-node': {
          prompt: 'Generate localized description.',
        },
      },
    });

    const result = await handleModel(context);
    const enqueueArgs = vi.mocked(aiJobsApi.enqueue).mock.calls.at(-1)?.[0] as
      | { type: string; payload: Record<string, unknown> }
      | undefined;

    expect(result['status']).toBe('queued');
    expect(enqueueArgs?.type).toBe('graph_model');
    expect(enqueueArgs?.payload).toMatchObject({
      modelId: 'gpt-4o-mini',
    });
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        modelId: 'gpt-4o-mini',
      })
    );
  });

  it('includes contextRegistry in the queued graph_model payload when available', async () => {
    vi.mocked(aiJobsApi.enqueue).mockResolvedValueOnce({
      ok: true,
      data: { jobId: 'job-queued-context' },
    } as Awaited<ReturnType<typeof aiJobsApi.enqueue>>);

    const contextRegistry: ContextRegistryConsumerEnvelope = {
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      engineVersion: 'test-engine',
    };
    const modelNode = buildModelNode();
    const promptNode = buildPromptNode('prompt-context');
    const edges: Edge[] = [
      {
        id: 'edge-context',
        from: 'prompt-context',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
    ];
    const context = buildContext({
      node: modelNode,
      nodes: [promptNode, modelNode],
      edges,
      contextRegistry,
      allOutputs: {
        'prompt-context': {
          prompt: 'Generate with page context.',
        },
      },
    });

    const result = await handleModel(context);
    const enqueueArgs = vi.mocked(aiJobsApi.enqueue).mock.calls.at(-1)?.[0] as
      | { type: string; payload: Record<string, unknown> }
      | undefined;

    expect(result['status']).toBe('queued');
    expect(enqueueArgs?.payload).toMatchObject({
      contextRegistry,
    });
    expect(result['debugPayload']).toEqual(
      expect.objectContaining({
        contextRegistry,
      })
    );
  });

  it('retries transient enqueue 404 and succeeds without failing the model node', async () => {
    vi.mocked(aiJobsApi.enqueue)
      .mockResolvedValueOnce({
        ok: false,
        error: 'Request failed with status 404',
      } as Awaited<ReturnType<typeof aiJobsApi.enqueue>>)
      .mockResolvedValueOnce({
        ok: true,
        data: { jobId: 'job-queued-retry' },
      } as Awaited<ReturnType<typeof aiJobsApi.enqueue>>);

    const modelNode = buildModelNode();
    const promptNode = buildPromptNode('prompt-retry');
    const edges: Edge[] = [
      {
        id: 'edge-retry',
        from: 'prompt-retry',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
    ];
    const context = buildContext({
      node: modelNode,
      nodes: [promptNode, modelNode],
      edges,
      allOutputs: {
        'prompt-retry': {
          prompt: 'Retry-enqueue prompt',
        },
      },
    });

    const result = await handleModel(context);

    expect(vi.mocked(aiJobsApi.enqueue)).toHaveBeenCalledTimes(2);
    expect(result['status']).toBe('queued');
    expect(result['jobId']).toBe('job-queued-retry');
  });

  it('reports required prompt port diagnostics when no prompt input can be resolved', async () => {
    const modelNode = buildModelNode();
    const promptA = buildPromptNode('prompt-a');
    const edges: Edge[] = [
      {
        id: 'edge-a',
        from: 'prompt-a',
        fromPort: 'prompt',
        to: 'model-1',
        toPort: 'prompt',
      } as Edge,
    ];
    const context = buildContext({
      node: modelNode,
      nodes: [promptA, modelNode],
      edges,
      allOutputs: {
        'prompt-a': {
          status: 'blocked',
          blockedReason: 'missing_inputs',
          waitingOnPorts: ['bundle'],
        },
      },
      allInputs: {
        'prompt-a': {},
      },
    });

    const result = await handleModel(context);

    expect(result['status']).toBe('blocked');
    expect(result['blockedReason']).toBe('missing_prompt');
    expect(result['requiredPorts']).toEqual(['prompt']);
    expect(result['waitingOnPorts']).toEqual(['prompt']);
    expect(result['promptSourceNodeIds']).toEqual(['prompt-a']);
    expect(result['promptSourceWaitingOnPorts']).toEqual(['bundle']);
  });
});
