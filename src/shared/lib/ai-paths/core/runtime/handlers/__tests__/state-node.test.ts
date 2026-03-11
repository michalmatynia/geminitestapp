import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { handleStateNode } from '../state-node';

const buildNode = (overrides: Partial<AiNode> = {}): AiNode => ({
  id: 'state-1',
  type: 'state',
  title: 'State Node',
  description: null,
  position: { x: 0, y: 0 },
  inputs: ['value', 'delta'],
  outputs: ['value', 'previous', 'delta'],
  config: {
    state: {
      key: 'counter',
      mode: 'read',
    },
  } as never,
  data: {},
  inputContracts: {},
  outputContracts: {},
  createdAt: new Date().toISOString(),
  updatedAt: null,
  ...overrides,
});

const buildContext = (overrides: Partial<NodeHandlerContext> = {}): NodeHandlerContext => {
  const node = overrides.node ?? buildNode();
  const context: NodeHandlerContext = {
    node,
    nodeInputs: { value: 1, delta: 1 },
    prevOutputs: {},
    edges: [],
    nodes: [node],
    nodeById: new Map([[node.id, node]]),
    runId: 'run-1',
    runStartedAt: new Date().toISOString(),
    runMeta: {},
    activePathId: null,
    allOutputs: {},
    allInputs: {},
    triggerNodeId: undefined,
    triggerEvent: undefined,
    triggerContext: undefined,
    deferPoll: false,
    skipAiJobs: false,
    now: new Date().toISOString(),
    abortSignal: undefined,
    fetchEntityCached: async () => null,
    reportAiPathsError: () => {},
    toast: () => {},
    simulationEntityType: null,
    simulationEntityId: null,
    resolvedEntity: null,
    fallbackEntityId: null,
    strictFlowMode: true,
    sideEffectControl: undefined,
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
    variables: {},
    setVariable: () => {},
    ...overrides,
  };
  const variables = context.variables ?? {};
  context.variables = variables;
  context.setVariable = (key: string, value: unknown) => {
    variables[key] = value;
  };
  return context;
};

describe('handleStateNode', () => {
  it('returns prevOutputs when node type is not state', async () => {
    const node = buildNode({ type: 'constant' as unknown as 'state' });
    const prevOutputs: RuntimePortValues = { value: 5 };
    const context = buildContext({ node, prevOutputs });
    const result = await handleStateNode(context);
    expect(result).toEqual(prevOutputs);
  });

  it('fails when key is missing', async () => {
    const node = buildNode({
      config: { state: { key: '', mode: 'read' } } as never,
    });
    const context = buildContext({ node });
    const result = await handleStateNode(context);
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('STATE_KEY_MISSING');
  });

  it('reads existing variable', async () => {
    const node = buildNode({
      config: { state: { key: 'counter', mode: 'read' } } as never,
    });
    const context = buildContext({
      node,
      variables: { counter: 42 },
    });
    const result = await handleStateNode(context);
    expect(result.value).toBe(42);
  });

  it('reads and initialises from initialJson when variable missing', async () => {
    const node = buildNode({
      config: { state: { key: 'counter', mode: 'read', initialJson: '10' } } as never,
    });
    const context = buildContext({ node });
    const result = await handleStateNode(context);
    expect(result.value).toBe(10);
  });

  it('writes variable from value input', async () => {
    const node = buildNode({
      config: { state: { key: 'counter', mode: 'write' } } as never,
    });
    const context = buildContext({
      node,
      nodeInputs: { value: 7 },
    });
    const result = await handleStateNode(context);
    expect(result.value).toBe(7);
    expect(context.variables['counter']).toBe(7);
  });

  it('increments numeric variable with delta', async () => {
    const node = buildNode({
      config: { state: { key: 'counter', mode: 'increment' } } as never,
    });
    const context = buildContext({
      node,
      variables: { counter: 5 },
      nodeInputs: { delta: 2 },
    });
    const result = await handleStateNode(context);
    expect(result.previous).toBe(5);
    expect(result.value).toBe(7);
    expect(result.delta).toBe(2);
    expect(context.variables['counter']).toBe(7);
  });
});
