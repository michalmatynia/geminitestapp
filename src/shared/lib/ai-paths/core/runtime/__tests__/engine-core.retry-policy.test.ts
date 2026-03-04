import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (runtimeRetryConfig: Record<string, unknown>): AiNode =>
  ({
    id: 'node-retry',
    type: 'custom_retry',
    title: 'Retry Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      runtime: {
        retry: runtimeRetryConfig,
      },
    },
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core retry policy', () => {
  it('does not retry when attempts is 1', async () => {
    const node = buildNode({ attempts: 1, backoffMs: 0 });
    const handler = vi.fn(async () => {
      throw new Error('boom');
    });

    await expect(
      evaluateGraphInternal([node], [] satisfies Edge[], {
        resolveHandler: () => handler,
        reportAiPathsError: (): void => {},
      })
    ).rejects.toThrow('boom');

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('retries when attempts is greater than 1', async () => {
    const node = buildNode({ attempts: 2, backoffMs: 0 });
    const handler = vi
      .fn<() => Promise<Record<string, unknown>>>()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValueOnce({ value: 'ok' });

    const result = await evaluateGraphInternal([node], [] satisfies Edge[], {
      resolveHandler: () => handler,
      reportAiPathsError: (): void => {},
    });

    expect(result.status).toBe('completed');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(result.outputs?.[node.id]?.['value']).toBe('ok');
  });
});
