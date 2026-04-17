import { beforeEach, describe, expect, it, vi } from 'vitest';

const { upsertPlaywrightActionRunHistoryMock } = vi.hoisted(() => ({
  upsertPlaywrightActionRunHistoryMock: vi.fn(),
}));

vi.mock('@/shared/lib/playwright/action-run-history-repository', () => ({
  upsertPlaywrightActionRunHistory: (...args: unknown[]) =>
    upsertPlaywrightActionRunHistoryMock(...args),
}));

import { recordPlaywrightActionRunSnapshot } from './action-run-history-recorder.server';

describe('recordPlaywrightActionRunSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes canonical scrapedItems from legacy rawProducts payloads', async () => {
    await recordPlaywrightActionRunSnapshot({
      runId: 'run-1',
      ownerUserId: null,
      status: 'completed',
      startedAt: '2026-04-18T08:00:00.000Z',
      completedAt: '2026-04-18T08:00:03.000Z',
      createdAt: '2026-04-18T08:00:00.000Z',
      updatedAt: '2026-04-18T08:00:03.000Z',
      result: {
        outputs: {
          result: {
            rawProducts: [{ title: 'Legacy item' }],
          },
        },
      },
      artifacts: [],
      logs: [],
      requestSummary: null,
    });

    expect(upsertPlaywrightActionRunHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        run: expect.objectContaining({
          runId: 'run-1',
          scrapedItems: [{ title: 'Legacy item' }],
        }),
      })
    );
  });
});
