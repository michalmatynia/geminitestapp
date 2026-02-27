import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildFailingNode = (type: string): AiNode =>
  ({
    id: `node-${type}`,
    type,
    title: 'Failing Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core onNodeError lifecycle', () => {
  it('invokes onNodeError when a node handler throws and does not emit onNodeFinish for that failure', async () => {
    const node = buildFailingNode('custom_failure');
    const onNodeFinish = vi.fn();
    const onNodeError = vi.fn();

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => {
          return () => {
            throw new Error('boom');
          };
        },
        onNodeFinish,
        onNodeError,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('boom');

    expect(onNodeError).toHaveBeenCalledTimes(1);
    const call = onNodeError.mock.calls[0] as [{ node: AiNode; error: Error }];
    expect(call?.[0]?.node?.id).toBe(node.id);
    expect(onNodeFinish).not.toHaveBeenCalled();
  });

  it('invokes onNodeError when no handler is registered for node type', async () => {
    const node = buildFailingNode('missing_handler');
    const onNodeError = vi.fn();

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => null,
        onNodeError,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('No handler found for node type: missing_handler');

    expect(onNodeError).toHaveBeenCalledTimes(1);
    const call = onNodeError.mock.calls[0] as [{ node: AiNode; error: Error }];
    expect(call?.[0]?.node?.id).toBe(node.id);
  });
});
