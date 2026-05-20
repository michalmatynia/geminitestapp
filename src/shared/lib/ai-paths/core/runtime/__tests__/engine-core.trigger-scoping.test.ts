import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (input: {
  id: string;
  type: string;
  inputs?: string[];
  outputs?: string[];
}): AiNode =>
  ({
    id: input.id,
    type: input.type,
    title: input.id,
    description: '',
    position: { x: 0, y: 0 },
    data: {},
    config: {},
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? ['value'],
  }) as AiNode;

const buildEdge = (input: {
  id: string;
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}): Edge =>
  ({
    id: input.id,
    from: input.from,
    fromPort: input.fromPort,
    to: input.to,
    toPort: input.toPort,
  }) as Edge;

describe('engine-core trigger scoping', () => {
  it('ignores incoming edges from out-of-scope trigger branches', async () => {
    const triggerA = buildNode({
      id: 'trigger-a',
      type: 'custom_trigger_a',
      outputs: ['trigger'],
    });
    const triggerB = buildNode({
      id: 'trigger-b',
      type: 'custom_trigger_b',
      outputs: ['trigger'],
    });
    const sourceA = buildNode({
      id: 'source-a',
      type: 'custom_source_a',
      inputs: ['trigger'],
      outputs: ['bundle'],
    });
    const sourceB = buildNode({
      id: 'source-b',
      type: 'custom_source_b',
      inputs: ['trigger'],
      outputs: ['context'],
    });
    const consumer = buildNode({
      id: 'consumer',
      type: 'custom_consumer',
      inputs: ['bundle', 'context'],
      outputs: ['result'],
    });

    const sourceAHandler = vi.fn(async () => ({ bundle: { title: 'only-a' } }));
    const sourceBHandler = vi.fn(async () => ({ context: { stale: true } }));
    const consumerHandler = vi.fn(async ({ nodeInputs }) => ({
      result: {
        bundle: nodeInputs['bundle'],
        context: nodeInputs['context'] ?? null,
      },
    }));

    const runtime = await evaluateGraphInternal(
      [triggerA, triggerB, sourceA, sourceB, consumer],
      [
        buildEdge({
          id: 'trigger-a->source-a',
          from: triggerA.id,
          fromPort: 'trigger',
          to: sourceA.id,
          toPort: 'trigger',
        }),
        buildEdge({
          id: 'trigger-b->source-b',
          from: triggerB.id,
          fromPort: 'trigger',
          to: sourceB.id,
          toPort: 'trigger',
        }),
        buildEdge({
          id: 'source-a->consumer',
          from: sourceA.id,
          fromPort: 'bundle',
          to: consumer.id,
          toPort: 'bundle',
        }),
        buildEdge({
          id: 'source-b->consumer',
          from: sourceB.id,
          fromPort: 'context',
          to: consumer.id,
          toPort: 'context',
        }),
      ],
      {
        triggerNodeId: triggerA.id,
        resolveHandler: (type) => {
          if (type === 'custom_trigger_a' || type === 'custom_trigger_b') {
            return async () => ({ trigger: true });
          }
          if (type === 'custom_source_a') return sourceAHandler;
          if (type === 'custom_source_b') return sourceBHandler;
          if (type === 'custom_consumer') return consumerHandler;
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(sourceAHandler).toHaveBeenCalledTimes(1);
    expect(sourceBHandler).not.toHaveBeenCalled();
    expect(consumerHandler).toHaveBeenCalledTimes(1);
    expect(consumerHandler.mock.calls[0]?.[0]?.nodeInputs).toEqual({
      bundle: { title: 'only-a' },
    });
    expect(runtime.nodeStatuses['consumer']).toBe('completed');
    expect(runtime.nodeOutputs['consumer']).toEqual({
      result: {
        bundle: { title: 'only-a' },
        context: null,
      },
    });
  });

  it('includes static upstream dependencies for the selected trigger branch', async () => {
    const triggerA = buildNode({
      id: 'trigger-a',
      type: 'custom_trigger_a',
      outputs: ['trigger'],
    });
    const triggerB = buildNode({
      id: 'trigger-b',
      type: 'custom_trigger_b',
      outputs: ['trigger'],
    });
    const sourceA = buildNode({
      id: 'source-a',
      type: 'custom_source_a',
      inputs: ['trigger'],
      outputs: ['bundle'],
    });
    const sourceB = buildNode({
      id: 'source-b',
      type: 'custom_source_b',
      inputs: ['trigger'],
      outputs: ['context'],
    });
    const staticPolicy = buildNode({
      id: 'static-policy',
      type: 'custom_static_policy',
      outputs: ['value'],
    });
    const consumer = {
      ...buildNode({
        id: 'consumer',
        type: 'custom_consumer',
        inputs: ['bundle', 'context', 'value'],
        outputs: ['result'],
      }),
      config: {
        runtime: {
          inputContracts: {
            bundle: { required: true },
            value: { required: true },
          },
        },
      },
    } as AiNode;

    const sourceAHandler = vi.fn(async () => ({ bundle: { title: 'only-a' } }));
    const sourceBHandler = vi.fn(async () => ({ context: { stale: true } }));
    const staticPolicyHandler = vi.fn(async () => ({ value: { minQualityScore: 0.8 } }));
    const consumerHandler = vi.fn(async ({ nodeInputs }) => ({
      result: {
        bundle: nodeInputs['bundle'],
        context: nodeInputs['context'] ?? null,
        value: nodeInputs['value'] ?? null,
      },
    }));

    const runtime = await evaluateGraphInternal(
      [triggerA, triggerB, sourceA, sourceB, staticPolicy, consumer],
      [
        buildEdge({
          id: 'trigger-a->source-a',
          from: triggerA.id,
          fromPort: 'trigger',
          to: sourceA.id,
          toPort: 'trigger',
        }),
        buildEdge({
          id: 'trigger-b->source-b',
          from: triggerB.id,
          fromPort: 'trigger',
          to: sourceB.id,
          toPort: 'trigger',
        }),
        buildEdge({
          id: 'source-a->consumer',
          from: sourceA.id,
          fromPort: 'bundle',
          to: consumer.id,
          toPort: 'bundle',
        }),
        buildEdge({
          id: 'source-b->consumer',
          from: sourceB.id,
          fromPort: 'context',
          to: consumer.id,
          toPort: 'context',
        }),
        buildEdge({
          id: 'static-policy->consumer',
          from: staticPolicy.id,
          fromPort: 'value',
          to: consumer.id,
          toPort: 'value',
        }),
      ],
      {
        triggerNodeId: triggerA.id,
        resolveHandler: (type) => {
          if (type === 'custom_trigger_a' || type === 'custom_trigger_b') {
            return async () => ({ trigger: true });
          }
          if (type === 'custom_source_a') return sourceAHandler;
          if (type === 'custom_source_b') return sourceBHandler;
          if (type === 'custom_static_policy') return staticPolicyHandler;
          if (type === 'custom_consumer') return consumerHandler;
          return null;
        },
        reportAiPathsError: (): void => {},
      }
    );

    expect(sourceAHandler).toHaveBeenCalledTimes(1);
    expect(sourceBHandler).not.toHaveBeenCalled();
    expect(staticPolicyHandler).toHaveBeenCalledTimes(1);
    expect(consumerHandler).toHaveBeenCalledTimes(1);
    expect(consumerHandler.mock.calls[0]?.[0]?.nodeInputs).toEqual({
      bundle: { title: 'only-a' },
      value: { minQualityScore: 0.8 },
    });
    expect(runtime.nodeStatuses['static-policy']).toBe('completed');
    expect(runtime.nodeStatuses['consumer']).toBe('completed');
    expect(runtime.nodeOutputs['consumer']).toEqual({
      result: {
        bundle: { title: 'only-a' },
        context: null,
        value: { minQualityScore: 0.8 },
      },
    });
  });
});
