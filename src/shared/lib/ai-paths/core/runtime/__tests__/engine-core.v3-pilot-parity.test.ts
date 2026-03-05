import { describe, expect, it } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler, RuntimeHistoryEntry } from '@/shared/contracts/ai-paths-runtime';
import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import {
  createNodeRuntimeKernel,
  toNodeRuntimeResolutionTelemetry,
} from '@/shared/lib/ai-paths/core/runtime/node-runtime-kernel';

type RuntimeMode = 'legacy_adapter' | 'code_object_v3';

const buildPilotNodes = (value: unknown): AiNode[] => [
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
    position: { x: 200, y: 0 },
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
    position: { x: 400, y: 0 },
  } as AiNode,
];

const buildPilotEdges = (): Edge[] => [
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

const pilotHandlers: Record<string, NodeHandler> = {
  constant: ({ node }) => {
    const valueType = node.config?.constant?.valueType;
    const rawValue = node.config?.constant?.value;
    if (valueType === 'number') {
      return { value: Number(rawValue ?? 0) };
    }
    return { value: rawValue ?? '' };
  },
  math: ({ node, nodeInputs }) => {
    const inputValue = nodeInputs['value'];
    const numeric = Number(inputValue);
    if (!Number.isFinite(numeric)) {
      return { value: inputValue };
    }
    const operand = Number(node.config?.math?.operand ?? 0);
    return { value: numeric + operand };
  },
  template: ({ node, nodeInputs }) => {
    const template = String(node.config?.template?.template ?? '{{value}}');
    const rendered = template.replace(/{{\s*value\s*}}/g, String(nodeInputs['value'] ?? ''));
    return { prompt: rendered };
  },
};

const stripRuntimeTelemetry = (
  history: Record<string, RuntimeHistoryEntry[]> | undefined
): Record<string, Array<Record<string, unknown>>> => {
  if (!history) return {};
  return Object.fromEntries(
    Object.entries(history).map(([nodeId, entries]) => [
      nodeId,
      entries.map((entry: RuntimeHistoryEntry) => {
        const clone = { ...entry } as Record<string, unknown>;
        delete clone['timestamp'];
        delete clone['durationMs'];
        delete clone['delayMs'];
        delete clone['runtimeStrategy'];
        delete clone['runtimeResolutionSource'];
        delete clone['runtimeCodeObjectId'];
        return clone;
      }),
    ])
  );
};

const runPilotPath = async (mode: RuntimeMode, value: unknown) => {
  const nodes = buildPilotNodes(value);
  const edges = buildPilotEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { v3PilotNodeTypes: [] } : {}),
  });

  const result = await evaluateGraphInternal(nodes, edges, {
    runId: `run-${mode}`,
    resolveHandler: runtimeKernel.resolveHandler,
    resolveHandlerTelemetry: (type: string) =>
      toNodeRuntimeResolutionTelemetry(runtimeKernel.resolveDescriptor(type)),
    recordHistory: true,
    profile: {
      onEvent: (event): void => {
        if (event.type === 'node') {
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

describe('engine-core v3 pilot dual-run parity', () => {
  it('keeps outputs and node statuses identical for numeric pilot path', async () => {
    const legacy = await runPilotPath('legacy_adapter', 7);
    const v3 = await runPilotPath('code_object_v3', 7);

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    const legacyNodeEvents = legacy.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );
    const v3NodeEvents = v3.profileNodeEvents.filter(
      (event) =>
        event['type'] === 'node' &&
        event['status'] === 'executed' &&
        typeof event['nodeId'] === 'string'
    );

    expect(legacyNodeEvents).toHaveLength(3);
    expect(v3NodeEvents).toHaveLength(3);
    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });

  it('keeps outputs and node statuses identical for non-numeric fallback path', async () => {
    const legacy = await runPilotPath('legacy_adapter', 'abc');
    const v3 = await runPilotPath('code_object_v3', 'abc');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    expect(legacy.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
    expect(v3.result.outputs['node-template']?.['prompt']).toBe('sum=abc');
  });
});
