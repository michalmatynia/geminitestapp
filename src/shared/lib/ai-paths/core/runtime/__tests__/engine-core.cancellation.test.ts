import { describe, expect, it, vi } from 'vitest';

import {
  evaluateGraphInternal,
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (id: string, type: string): AiNode =>
  ({
    id,
    type,
    title: id,
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core cancellation', () => {
  it('halts with GraphExecutionCancelled when the abort signal is tripped between iterations', async () => {
    const controller = new AbortController();
    const onHalt = vi.fn();

    await expect(
      evaluateGraphInternal([buildNode('node-1', 'constant')], [] satisfies Edge[], {
        abortSignal: controller.signal,
        resolveHandler: () => async () => ({ value: 'done' }),
        onIteration: ({ iteration }) => {
          if (iteration === 1) {
            controller.abort('manual cancellation');
          }
        },
        onHalt,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toBeInstanceOf(GraphExecutionCancelled);

    expect(onHalt).toHaveBeenCalledTimes(1);
    expect(onHalt).toHaveBeenCalledWith(
      expect.objectContaining({
        reason: 'failed',
      })
    );
  });
});
