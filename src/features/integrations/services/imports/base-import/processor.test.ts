import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  updateBaseImportRunItemMock: vi.fn(),
  recomputeBaseImportRunStatsMock: vi.fn(),
  listBaseImportRunItemsMock: vi.fn(),
  putBaseImportRunItemsMock: vi.fn(),
  updateBaseImportRunStatusMock: vi.fn(),
  buildSummaryMessageMock: vi.fn(),
  determineBaseImportTerminalStatusMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/imports/base-import-run-repository', () => ({
  updateBaseImportRunItem: (...args: unknown[]) => mocks.updateBaseImportRunItemMock(...args),
  recomputeBaseImportRunStats: (...args: unknown[]) => mocks.recomputeBaseImportRunStatsMock(...args),
  listBaseImportRunItems: (...args: unknown[]) => mocks.listBaseImportRunItemsMock(...args),
  putBaseImportRunItems: (...args: unknown[]) => mocks.putBaseImportRunItemsMock(...args),
  updateBaseImportRunStatus: (...args: unknown[]) => mocks.updateBaseImportRunStatusMock(...args),
}));

vi.mock('@/features/integrations/services/imports/base-import-error-utils', () => ({
  buildSummaryMessage: (...args: unknown[]) => mocks.buildSummaryMessageMock(...args),
  determineBaseImportTerminalStatus: (...args: unknown[]) =>
    mocks.determineBaseImportTerminalStatusMock(...args),
}));

import { failRemainingItems, markRunItem } from './processor';

describe('markRunItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T15:40:00.000Z'));
    vi.clearAllMocks();
    mocks.recomputeBaseImportRunStatsMock.mockResolvedValue({
      id: 'run-1',
      status: 'running',
      params: { dryRun: false },
      stats: {
        total: 1,
        pending: 0,
        processing: 0,
        imported: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
    });
    mocks.buildSummaryMessageMock.mockReturnValue(
      'Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.'
    );
    mocks.determineBaseImportTerminalStatusMock.mockReturnValue('completed');
    mocks.updateBaseImportRunStatusMock.mockResolvedValue(undefined);
  });

  it('sets finishedAt for terminal item updates and finalizes runs with no pending work', async () => {
    await markRunItem(
      'run-1',
      {
        itemId: 'item-1',
      } as never,
      {
        status: 'updated',
        action: 'updated',
      }
    );

    expect(mocks.updateBaseImportRunItemMock).toHaveBeenCalledWith(
      'run-1',
      'item-1',
      expect.objectContaining({
        status: 'updated',
        action: 'updated',
        finishedAt: '2026-04-10T15:40:00.000Z',
      })
    );
    expect(mocks.recomputeBaseImportRunStatsMock).toHaveBeenCalledWith('run-1');
    expect(mocks.determineBaseImportTerminalStatusMock).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 1,
        pending: 0,
        processing: 0,
        imported: 1,
      })
    );
    expect(mocks.updateBaseImportRunStatusMock).toHaveBeenCalledWith('run-1', 'completed', {
      finishedAt: '2026-04-10T15:40:00.000Z',
      summaryMessage: 'Import completed: 1 imported, 0 updated, 0 skipped, 0 failed.',
    });
  });

  it('does not auto-finalize runs that still have pending work', async () => {
    mocks.recomputeBaseImportRunStatsMock.mockResolvedValueOnce({
      id: 'run-1',
      status: 'running',
      params: { dryRun: false },
      stats: {
        total: 2,
        pending: 1,
        processing: 0,
        imported: 1,
        updated: 0,
        skipped: 0,
        failed: 0,
      },
    });

    await markRunItem(
      'run-1',
      {
        itemId: 'item-1',
      } as never,
      {
        status: 'updated',
        action: 'updated',
      }
    );

    expect(mocks.updateBaseImportRunStatusMock).not.toHaveBeenCalled();
  });
});

describe('failRemainingItems', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T15:40:00.000Z'));
    vi.clearAllMocks();
  });

  it('marks allowed items failed with finishedAt and recomputes stats', async () => {
    mocks.listBaseImportRunItemsMock.mockResolvedValue([
      {
        runId: 'run-1',
        itemId: 'item-1',
        status: 'pending',
      },
      {
        runId: 'run-1',
        itemId: 'item-2',
        status: 'imported',
      },
    ]);

    await failRemainingItems({
      runId: 'run-1',
      allowedStatuses: new Set(['pending']),
      code: 'CANCELED',
      errorClass: 'canceled',
      retryable: false,
      message: 'Run canceled by user request.',
    });

    expect(mocks.putBaseImportRunItemsMock).toHaveBeenCalledWith([
      expect.objectContaining({
        itemId: 'item-1',
        status: 'failed',
        finishedAt: '2026-04-10T15:40:00.000Z',
      }),
    ]);
    expect(mocks.recomputeBaseImportRunStatsMock).toHaveBeenCalledWith('run-1');
  });
});
