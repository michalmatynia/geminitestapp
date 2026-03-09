import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleAgent } from '@/shared/lib/ai-paths/core/runtime/handlers/agent';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import type { AiNode, RuntimePortValues } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext } from '@/shared/contracts/ai-paths-runtime';

const { enqueueMock, pollMock, learnerChatMock, settingsListMock } = vi.hoisted(() => ({
  enqueueMock: vi.fn(),
  pollMock: vi.fn(),
  learnerChatMock: vi.fn(),
  settingsListMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  agentApi: {
    enqueue: enqueueMock,
    poll: pollMock,
  },
  learnerAgentsApi: {
    chat: learnerChatMock,
  },
  settingsApi: {
    list: settingsListMock,
  },
}));

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-agent',
    type: 'agent',
    title: 'Agent',
    description: 'Agent node',
    position: { x: 0, y: 0 },
    data: {},
    inputs: ['prompt', 'value', 'result', 'bundle'],
    outputs: ['result', 'bundle', 'status', 'jobId'],
    config: {
      agent: {
        personaId: '',
        promptTemplate: '',
        waitForResult: false,
      },
    },
    ...(patch as Record<string, unknown>),
  }) as AiNode;

const buildContext = (
  node: AiNode,
  nodeInputs: RuntimePortValues,
  contextRegistry?: ContextRegistryConsumerEnvelope | null
): NodeHandlerContext =>
  ({
    node,
    nodeInputs,
    prevOutputs: {},
    edges: [],
    nodes: [node],
    nodeById: new Map<string, AiNode>([[node.id, node]]),
    runId: 'run-agent-1',
    runStartedAt: new Date().toISOString(),
    activePathId: 'path-1',
    contextRegistry: contextRegistry ?? null,
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: undefined,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
    allOutputs: {},
    allInputs: {},
    fetchEntityCached: async () => null,
    reportAiPathsError: vi.fn(),
    toast: vi.fn(),
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    executed: {
      notification: new Set<string>(),
      updater: new Set<string>(),
      http: new Set<string>(),
      delay: new Set<string>(),
      poll: new Set<string>(),
      ai: new Set<string>(),
      schema: new Set<string>(),
      mapper: new Set<string>(),
    },
  }) as NodeHandlerContext;

describe('handleAgent', () => {
  beforeEach(() => {
    enqueueMock.mockReset();
    pollMock.mockReset();
    learnerChatMock.mockReset();
    settingsListMock.mockReset();
    settingsListMock.mockResolvedValue({
      ok: true,
      data: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('includes contextRegistry in the queued agent payload when available', async () => {
    enqueueMock.mockResolvedValueOnce({
      ok: true,
      data: { runId: 'agent-run-1' },
    });

    const contextRegistry: ContextRegistryConsumerEnvelope = {
      refs: [{ id: 'page:ai-paths', kind: 'static_node' }],
      engineVersion: 'test-engine',
    };
    const node = buildNode();
    const context = buildContext(
      node,
      {
        prompt: 'Review the currently selected path node.',
      },
      contextRegistry
    );

    const result = await handleAgent(context);

    expect(result['status']).toBe('queued');
    expect(result['jobId']).toBe('agent-run-1');
    expect(enqueueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Review the currently selected path node.',
        contextRegistry,
      })
    );
  });
});
