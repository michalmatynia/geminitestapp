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

const buildTransformPilotNodes = (title: string): AiNode[] => [
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
        value: JSON.stringify({ title }),
      },
    },
    position: { x: 0, y: 180 },
  } as AiNode,
  {
    id: 'node-parser',
    type: 'parser',
    title: 'JSON Parser',
    description: '',
    inputs: ['entityJson', 'context'],
    outputs: ['productId', 'title', 'images', 'content_en'],
    config: {
      parser: {
        outputMode: 'individual',
        mappings: {
          title: 'title',
        },
      },
    },
    position: { x: 180, y: 180 },
  } as AiNode,
  {
    id: 'node-mapper',
    type: 'mapper',
    title: 'JSON Mapper',
    description: '',
    inputs: ['context', 'result', 'bundle', 'value'],
    outputs: ['value', 'result'],
    config: {
      mapper: {
        outputs: ['value'],
        mappings: {
          value: 'title',
        },
      },
    },
    position: { x: 360, y: 180 },
  } as AiNode,
  {
    id: 'node-mutator',
    type: 'mutator',
    title: 'Mutator',
    description: '',
    inputs: ['context'],
    outputs: ['context'],
    config: {
      mutator: {
        suffix: '-mutated',
      },
    },
    position: { x: 540, y: 180 },
  } as AiNode,
  {
    id: 'node-regex',
    type: 'regex',
    title: 'Regex Grouper',
    description: '',
    inputs: ['value', 'prompt', 'regexCallback'],
    outputs: ['grouped', 'matches', 'value', 'aiPrompt'],
    config: {
      regex: {
        pattern: '\\s+',
        flags: 'g',
      },
    },
    position: { x: 720, y: 180 },
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
        template: 'out={{value}}',
      },
    },
    position: { x: 900, y: 180 },
  } as AiNode,
];

const buildTransformPilotEdges = (): Edge[] => [
  {
    id: 'edge-constant-parser',
    from: 'node-constant',
    to: 'node-parser',
    fromPort: 'value',
    toPort: 'entityJson',
  },
  {
    id: 'edge-parser-mapper',
    from: 'node-parser',
    to: 'node-mapper',
    fromPort: 'title',
    toPort: 'value',
  },
  {
    id: 'edge-mapper-mutator',
    from: 'node-mapper',
    to: 'node-mutator',
    fromPort: 'value',
    toPort: 'context',
  },
  {
    id: 'edge-mutator-regex',
    from: 'node-mutator',
    to: 'node-regex',
    fromPort: 'context',
    toPort: 'value',
  },
  {
    id: 'edge-regex-template',
    from: 'node-regex',
    to: 'node-template',
    fromPort: 'value',
    toPort: 'value',
  },
];

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

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
  parser: ({ nodeInputs }) => {
    const rawInput = nodeInputs['entityJson'] ?? nodeInputs['context'];
    let parsed = asRecord(rawInput);

    if (typeof rawInput === 'string') {
      try {
        parsed = asRecord(JSON.parse(rawInput));
      } catch {
        parsed = {};
      }
    }

    return {
      productId: String(parsed['productId'] ?? ''),
      title: String(parsed['title'] ?? ''),
      images: Array.isArray(parsed['images']) ? parsed['images'] : [],
      content_en: String(parsed['content_en'] ?? ''),
    };
  },
  mapper: ({ nodeInputs }) => {
    const value = nodeInputs['value'] ?? nodeInputs['context'] ?? nodeInputs['result'] ?? nodeInputs['bundle'];
    return {
      value: String(value ?? ''),
      result: value,
    };
  },
  mutator: ({ node, nodeInputs }) => {
    const input = String(nodeInputs['context'] ?? '');
    const suffix = String(node.config?.mutator?.suffix ?? '');
    return {
      context: `${input}${suffix}`,
    };
  },
  regex: ({ node, nodeInputs }) => {
    const input = String(nodeInputs['value'] ?? '');
    const pattern = String(node.config?.regex?.pattern ?? '\\s+');
    const flags = String(node.config?.regex?.flags ?? 'g');
    const transformed = (() => {
      try {
        return input.replace(new RegExp(pattern, flags), '_');
      } catch {
        return input;
      }
    })();
    return {
      grouped: { transformed: [transformed] },
      matches: [transformed],
      value: transformed,
      aiPrompt: '',
    };
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

const runTransformPilotPath = async (mode: RuntimeMode, title: string) => {
  const nodes = buildTransformPilotNodes(title);
  const edges = buildTransformPilotEdges();
  const profileNodeEvents: Array<Record<string, unknown>> = [];

  const runtimeKernel = createNodeRuntimeKernel({
    resolveLegacyHandler: (nodeType: string) => pilotHandlers[nodeType] ?? null,
    ...(mode === 'legacy_adapter' ? { v3PilotNodeTypes: [] } : {}),
  });

  const result = await evaluateGraphInternal(nodes, edges, {
    runId: `run-transform-${mode}`,
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

  it('keeps outputs, statuses, and strategy telemetry identical for transform pilot path', async () => {
    const legacy = await runTransformPilotPath('legacy_adapter', 'Wave A Kernel');
    const v3 = await runTransformPilotPath('code_object_v3', 'Wave A Kernel');

    expect(legacy.result.status).toBe('completed');
    expect(v3.result.status).toBe('completed');
    expect(legacy.result.outputs).toEqual(v3.result.outputs);
    expect(legacy.result.nodeStatuses).toEqual(v3.result.nodeStatuses);
    expect(stripRuntimeTelemetry(legacy.result.history)).toEqual(stripRuntimeTelemetry(v3.result.history));

    expect(legacy.result.outputs['node-template']?.['prompt']).toBe('out=Wave_A_Kernel-mutated');
    expect(v3.result.outputs['node-template']?.['prompt']).toBe('out=Wave_A_Kernel-mutated');

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

    expect(legacyNodeEvents).toHaveLength(6);
    expect(v3NodeEvents).toHaveLength(6);

    legacyNodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('legacy_adapter');
      expect(event['runtimeCodeObjectId']).toBeNull();
    });
    v3NodeEvents.forEach((event) => {
      expect(event['runtimeStrategy']).toBe('code_object_v3');
      expect(typeof event['runtimeCodeObjectId']).toBe('string');
    });
  });
});
