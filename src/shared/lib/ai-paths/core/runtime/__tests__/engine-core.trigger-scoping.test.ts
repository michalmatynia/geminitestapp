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
});
