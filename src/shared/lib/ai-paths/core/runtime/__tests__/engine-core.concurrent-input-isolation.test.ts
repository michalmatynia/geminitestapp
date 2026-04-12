import { describe, expect, it } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { NodeHandler } from '@/shared/contracts/ai-paths-runtime';

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
    inputs: input.inputs ?? [],
    outputs: input.outputs ?? ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core concurrent input isolation', () => {
  it('clones propagated inputs so parallel nodes cannot mutate sibling inputs or upstream outputs', async () => {
    let resolveMutationDone: (() => void) | null = null;
    const mutationDone = new Promise<void>((resolve) => {
      resolveMutationDone = resolve;
    });

    const source = buildNode({ id: 'node-source', type: 'source' });
    const mutator = buildNode({ id: 'node-mutator', type: 'mutator', inputs: ['value'] });
    const observer = buildNode({
      id: 'node-observer',
      type: 'observer',
      inputs: ['value'],
      outputs: ['observed'],
    });

    const edges: Edge[] = [
      {
        id: 'edge-source-mutator',
        from: source.id,
        to: mutator.id,
        fromPort: 'value',
        toPort: 'value',
      },
      {
        id: 'edge-source-observer',
        from: source.id,
        to: observer.id,
        fromPort: 'value',
        toPort: 'value',
      },
    ];

    const resolveHandler = (type: string): NodeHandler | null => {
      if (type === 'source') {
        return async () => ({
          value: {
            nested: {
              flag: 'original',
            },
          },
        });
      }
      if (type === 'mutator') {
        return async ({ nodeInputs }) => {
          const payload = nodeInputs['value'] as { nested: { flag: string } };
          payload.nested.flag = 'mutated';
          resolveMutationDone?.();
          return {
            value: payload,
          };
        };
      }
      if (type === 'observer') {
        return async ({ nodeInputs }) => {
          await mutationDone;
          const payload = nodeInputs['value'] as { nested: { flag: string } };
          return {
            observed: payload.nested.flag,
          };
        };
      }
      return null;
    };

    const result = await evaluateGraphInternal([source, mutator, observer], edges, {
      resolveHandler,
      reportAiPathsError: (): void => {},
    });

    expect(result.outputs?.[observer.id]?.['observed']).toBe('original');
    expect(result.outputs?.[source.id]?.['value']).toEqual({
      nested: {
        flag: 'original',
      },
    });
  });
});
