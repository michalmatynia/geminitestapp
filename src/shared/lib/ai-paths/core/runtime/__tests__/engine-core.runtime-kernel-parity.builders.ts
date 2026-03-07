import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { evaluateGraphClient } from '@/shared/lib/ai-paths/core/runtime/engine-client';

export type RuntimeMode = 'compatibility' | 'code_object_v3';

const buildKernelNodes = (value: unknown): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        valueType: typeof value === 'number' ? 'number' : 'string',
        value,
      },
    },
    position: { x: 0, y: 0 },
  } as AiNode,
  {
    id: 'node-math',
    type: 'math',
    title: 'Math',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      math: {
        operation: 'add',
        operand: 5,
      },
    },
    position: { x: 220, y: 0 },
  } as AiNode,
  {
    id: 'node-template',
    type: 'template',
    title: 'Template',
    description: '',
    inputs: ['value'],
    outputs: ['prompt'],
    config: {
      template: {
        template: 'sum={{value}}',
      },
    },
    position: { x: 440, y: 0 },
  } as AiNode,
];

const buildKernelEdges = (): Edge[] => [
  {
    id: 'edge-constant-math',
    from: 'node-constant',
    to: 'node-math',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-math-template',
    from: 'node-math',
    to: 'node-template',
    fromPort: 'value',
    toPort: 'value',
  },
];

const buildTransformKernelNodes = (title: string): AiNode[] => [
  {
    id: 'node-constant',
    type: 'constant',
    title: 'Constant',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      constant: {
        valueType: 'string',
        value: title,
      },
    },
    position: { x: 0, y: 180 },
  } as AiNode,
  {
    id: 'node-string-mutator',
    type: 'string_mutator',
    title: 'String Mutator',
    description: '',
    inputs: ['value'],
    outputs: ['value'],
    config: {
      stringMutator: {
        operations: [
          {
            type: 'append',
            position: 'suffix',
            value: '-mutated-v3',
          },
        ],
      },
    },
    position: { x: 220, y: 180 },
  } as AiNode,
  {
    id: 'node-template',
    type: 'template',
    title: 'Template',
    description: '',
    inputs: ['value'],
    outputs: ['prompt'],
    config: {
      template: {
        template: 'title={{value}}',
      },
    },
    position: { x: 440, y: 180 },
  } as AiNode,
];

const buildTransformKernelEdges = (): Edge[] => [
  {
    id: 'edge-constant-string-mutator',
    from: 'node-constant',
    to: 'node-string-mutator',
    fromPort: 'value',
    toPort: 'value',
  },
  {
    id: 'edge-string-mutator-template',
    from: 'node-string-mutator',
    to: 'node-template',
    fromPort: 'value',
    toPort: 'value',
  },
];

type KernelRunResult = Awaited<ReturnType<typeof evaluateGraphClient>>;

type KernelRunSummary = {
  result: KernelRunResult;
  profileNodeEvents: Array<Record<string, unknown>>;
};

const buildRuntimeKernelNodeTypes = (mode: RuntimeMode, nodes: AiNode[]): string[] =>
  mode === 'code_object_v3' ? Array.from(new Set(nodes.map((node) => node.type))) : [];

const runPath = async (
  mode: RuntimeMode,
  nodes: AiNode[],
  edges: Edge[]
): Promise<KernelRunSummary> => {
  const profileNodeEvents: Array<Record<string, unknown>> = [];
  const result = await evaluateGraphClient({
    runId: 'test-run-id',
    nodes,
    edges,
    runtimeKernelNodeTypes: buildRuntimeKernelNodeTypes(mode, nodes),
    recordHistory: true,
    profile: {
      onEvent: (event): void => {
        if (event.type === 'node' && event.status === 'executed') {
          profileNodeEvents.push(event as unknown as Record<string, unknown>);
        }
      },
    },
    reportAiPathsError: (): void => {},
  });
  return {
    result,
    profileNodeEvents,
  };
};

export const runKernelPath = async (mode: RuntimeMode, value: unknown): Promise<KernelRunSummary> =>
  runPath(mode, buildKernelNodes(value), buildKernelEdges());

export const runTransformKernelPath = async (
  mode: RuntimeMode,
  title: string
): Promise<KernelRunSummary> =>
  runPath(mode, buildTransformKernelNodes(title), buildTransformKernelEdges());

export const stripRuntimeTelemetry = (
  history: Record<string, RuntimeHistoryEntry[]> | undefined
): Record<
  string,
  Array<
    Omit<
      RuntimeHistoryEntry,
      | 'runtimeStrategy'
      | 'runtimeResolutionSource'
      | 'runtimeCodeObjectId'
      | 'timestamp'
      | 'durationMs'
      | 'traceId'
      | 'spanId'
      | 'inputHash'
      | 'activationHash'
    >
  >
> =>
  Object.fromEntries(
    Object.entries(history ?? {}).map(([nodeId, entries]) => [
      nodeId,
      entries.map(
        ({
          runtimeStrategy: _runtimeStrategy,
          runtimeResolutionSource: _runtimeResolutionSource,
          runtimeCodeObjectId: _runtimeCodeObjectId,
          timestamp: _timestamp,
          durationMs: _durationMs,
          traceId: _traceId,
          spanId: _spanId,
          inputHash: _inputHash,
          activationHash: _activationHash,
          ...rest
        }) => rest
      ),
    ])
  );
