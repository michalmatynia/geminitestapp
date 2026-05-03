import { describe, expect, it } from 'vitest';

import { internalError } from '@/shared/errors/app-error';

import { runPlaywrightInstanceTask } from './instance-task';

describe('playwright instance task helper', () => {
  it('maps a generic Playwright instance result through the shared adapter boundary', async () => {
    const result = await runPlaywrightInstanceTask({
      execute: async () => ({
        runId: 'run-123',
        status: 'completed',
      }),
      mapResult: async (result) => ({
        runId: result.runId,
        status: result.status,
      }),
    });

    expect(result).toEqual({
      runId: 'run-123',
      status: 'completed',
    });
  });

  it('merges additional metadata into AppError failures', async () => {
    await expect(
      runPlaywrightInstanceTask({
        execute: async () => {
          throw internalError('Playwright instance failed', {
            runId: 'run-123',
          });
        },
        mapResult: async () => null,
        buildErrorAdditional: async () => ({
          instanceKind: 'programmable_listing',
        }),
      })
    ).rejects.toMatchObject({
      message: 'Playwright instance failed',
      meta: {
        runId: 'run-123',
        instanceKind: 'programmable_listing',
      },
    });
  });
});
