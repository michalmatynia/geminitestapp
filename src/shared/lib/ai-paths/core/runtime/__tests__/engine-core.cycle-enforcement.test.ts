import { describe, expect, it, vi } from 'vitest';

import {
  evaluateGraphInternal,
  GraphExecutionError,
} from '@/shared/lib/ai-paths/core/runtime/engine-core';
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

describe('engine-core cycle enforcement', () => {
  it('rejects unsupported cycles before execution starts', async () => {
    const startedNodes: string[] = [];

    await expect(
      evaluateGraphInternal(
        [
          buildNode({ id: 'mapper-a', type: 'mapper', inputs: ['value'], outputs: ['value'] }),
          buildNode({ id: 'mapper-b', type: 'mapper', inputs: ['value'], outputs: ['value'] }),
        ],
        [
          {
            id: 'edge-a',
            from: 'mapper-a',
            to: 'mapper-b',
            fromPort: 'value',
            toPort: 'value',
          },
          {
            id: 'edge-b',
            from: 'mapper-b',
            to: 'mapper-a',
            fromPort: 'value',
            toPort: 'value',
          },
        ] satisfies Edge[],
        {
          resolveHandler: () => async () => ({ value: 'should-not-run' }),
          onNodeStart: ({ node }) => {
            startedNodes.push(node.id);
          },
          reportAiPathsError: (): void => {},
        }
      )
    ).rejects.toBeInstanceOf(GraphExecutionError);

    await expect(
      evaluateGraphInternal(
        [
          buildNode({ id: 'mapper-a', type: 'mapper', inputs: ['value'], outputs: ['value'] }),
          buildNode({ id: 'mapper-b', type: 'mapper', inputs: ['value'], outputs: ['value'] }),
        ],
        [
          {
            id: 'edge-a',
            from: 'mapper-a',
            to: 'mapper-b',
            fromPort: 'value',
            toPort: 'value',
          },
          {
            id: 'edge-b',
            from: 'mapper-b',
            to: 'mapper-a',
            fromPort: 'value',
            toPort: 'value',
          },
        ] satisfies Edge[],
        {
          resolveHandler: () => async () => ({ value: 'should-not-run' }),
          reportAiPathsError: (): void => {},
        }
      )
    ).rejects.toMatchObject({
      message: expect.stringContaining('Unsupported circular dependency detected'),
    });

    expect(startedNodes).toEqual([]);
  });

  it('does not reject allowed iterator-delay loops during preparation', async () => {
    await expect(
      evaluateGraphInternal(
        [
          buildNode({ id: 'iter-1', type: 'iterator', inputs: ['value'], outputs: ['value'] }),
          buildNode({ id: 'delay-1', type: 'delay', inputs: ['value'], outputs: ['value'] }),
        ],
        [
          {
            id: 'edge-a',
            from: 'iter-1',
            to: 'delay-1',
            fromPort: 'value',
            toPort: 'value',
          },
          {
            id: 'edge-b',
            from: 'delay-1',
            to: 'iter-1',
            fromPort: 'value',
            toPort: 'value',
          },
        ] satisfies Edge[],
        {
          maxIterations: 1,
          resolveHandler: (type) => {
            if (type === 'iterator' || type === 'delay') {
              return async () => ({ value: 'loop' });
            }
            return null;
          },
          reportAiPathsError: (): void => {},
        }
      )
    ).rejects.not.toMatchObject({
      message: expect.stringContaining('Unsupported circular dependency detected'),
    });
  });
});
