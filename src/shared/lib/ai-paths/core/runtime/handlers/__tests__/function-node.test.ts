import type { AiNode } from '@/shared/contracts/ai-paths';
import type { NodeHandlerContext, RuntimePortValues } from '@/shared/contracts/ai-paths-runtime';

import { handleFunctionNode } from '../function-node';

const buildNode = (overrides: Partial<AiNode> = {}): AiNode => ({
  id: 'function-1',
  type: 'function',
  title: 'Function Node',
  description: null,
  position: { x: 0, y: 0 },
  inputs: ['value'],
  outputs: ['value'],
  config: {
    function: {
      script: 'return inputs.value * 2;',
    },
  },
  data: {},
  inputContracts: {},
  outputContracts: {},
  createdAt: new Date().toISOString(),
  updatedAt: null,
  ...overrides,
});

const buildContext = (overrides: Partial<NodeHandlerContext> = {}): NodeHandlerContext => {
  const node = overrides.node ?? buildNode();
  return {
    node,
    nodeInputs: { value: 2 },
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
    ...overrides,
  };
};

describe('handleFunctionNode', () => {
  it('returns prevOutputs when node type is not function', async () => {
    const node = buildNode({ type: 'constant' as unknown as 'function' });
    const prevOutputs: RuntimePortValues = { value: 1 };
    const context = buildContext({ node, prevOutputs });
    const result = await handleFunctionNode(context);
    expect(result).toEqual(prevOutputs);
  });

  it('fails when script is empty', async () => {
    const node = buildNode({
      config: { function: { script: '' } },
    });
    const context = buildContext({ node });
    const result = await handleFunctionNode(context);
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('FUNCTION_SCRIPT_EMPTY');
  });

  it('executes script and maps primitive result to value', async () => {
    const node = buildNode({
      config: { function: { script: 'return inputs.value * 3;' } },
    });
    const context = buildContext({
      node,
      nodeInputs: { value: 4 },
    });
    const result = await handleFunctionNode(context);
    expect(result.value).toBe(12);
  });

  it('executes script and maps object result to ports', async () => {
    const node = buildNode({
      outputs: ['foo', 'bar'],
      config: {
        function: {
          script: 'return { foo: inputs.value, bar: inputs.value + 1 };',
        },
      },
    });
    const context = buildContext({
      node,
      nodeInputs: { value: 10 },
    });
    const result = await handleFunctionNode(context);
    expect(result.foo).toBe(10);
    expect(result.bar).toBe(11);
  });

  it('injects contextJson as second argument', async () => {
    const node = buildNode({
      config: {
        function: {
          script: 'return context.factor * inputs.value;',
          contextJson: '{"factor": 5}',
        },
      },
    });
    const context = buildContext({
      node,
      nodeInputs: { value: 2 },
    });
    const result = await handleFunctionNode(context);
    expect(result.value).toBe(10);
  });

  it('provides utils helpers on context', async () => {
    const node = buildNode({
      config: {
        function: {
          script: `
            const original = { foo: { bar: inputs.value } };
            const withSet = context.utils.set(original, 'foo.baz', context.utils.ensureNumber('3', 0));
            const read = context.utils.get(withSet, 'foo.baz');
            return { result: read, cloned: context.utils.clone(withSet) };
          `,
          contextJson: '{"initial": true}',
        },
      },
    });
    const context = buildContext({
      node,
      nodeInputs: { value: 7 },
    });
    const result = await handleFunctionNode(context);
    expect(result.result).toBe(3);
    expect(result.cloned).toBeDefined();
  });

  it('returns compile error metadata on invalid script', async () => {
    const node = buildNode({
      config: {
        function: {
          // Invalid JS
          script: 'return inputs.value *;',
        },
      },
    });
    const context = buildContext({ node });
    const result = await handleFunctionNode(context);
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('FUNCTION_SCRIPT_COMPILE_ERROR');
    expect(typeof result.error).toBe('string');
  });

  it('returns runtime error metadata on thrown error', async () => {
    const node = buildNode({
      config: {
        function: {
          script: 'throw new Error("Boom");',
        },
      },
    });
    const context = buildContext({ node });
    const result = await handleFunctionNode(context);
    expect(result.status).toBe('failed');
    expect(result.errorCode).toBe('FUNCTION_SCRIPT_RUNTIME_ERROR');
    expect(result.error).toContain('Boom');
  });
}

