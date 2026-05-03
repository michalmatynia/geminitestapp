import { describe, expect, it, vi } from 'vitest';

import {
  evaluateGraphInternal,
  GraphExecutionCancelled,
} from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (): AiNode =>
  ({
    id: 'node-timeout',
    type: 'timeout_node',
    title: 'Timeout Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {
      runtime: {
        timeoutMs: 250,
      },
    },
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core timeout budget', () => {
  it('cancels long-running node execution when maxDurationMs is exceeded', async () => {
    const onHalt = vi.fn();

    await expect(
      evaluateGraphInternal([buildNode()], [] satisfies Edge[], {
        maxDurationMs: 25,
        resolveHandler: () => {
          return async ({ abortSignal }) =>
            await new Promise((_resolve, reject) => {
              const rejectWithAbort = (): void => {
                const abortError = new Error('Operation aborted.');
                (abortError as { name?: string }).name = 'AbortError';
                reject(abortError);
              };

              if (abortSignal?.aborted) {
                rejectWithAbort();
                return;
              }

              abortSignal?.addEventListener('abort', rejectWithAbort, { once: true });
            });
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
