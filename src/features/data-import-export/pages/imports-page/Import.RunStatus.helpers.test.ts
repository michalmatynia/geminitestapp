import { describe, expect, it } from 'vitest';

import {
  getImportRunErrorItems,
  resolveImportRunRetryDiagnostics,
  resolveImportRunDispatchDiagnostics,
} from './Import.RunStatus.helpers';

describe('resolveImportRunDispatchDiagnostics', () => {
  it('returns null when the run is missing', () => {
    expect(resolveImportRunDispatchDiagnostics(null)).toBeNull();
  });

  it('returns a preflight-blocked diagnostic when preflight fails', () => {
    expect(
      resolveImportRunDispatchDiagnostics({
        id: 'run-1',
        status: 'failed',
        params: {
          connectionId: 'conn-1',
          inventoryId: 'inv-1',
          catalogId: 'cat-1',
          imageMode: 'download',
          uniqueOnly: true,
          allowDuplicateSku: false,
          dryRun: false,
          mode: 'create_only',
        },
        preflight: {
          ok: false,
          checkedAt: '2026-04-09T18:00:00.000Z',
          issues: [{ code: 'MISSING_CATALOG', message: 'Catalog is required.', severity: 'error' }],
        },
        stats: {
          total: 0,
          pending: 0,
          processing: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        summaryMessage: 'Preflight failed. Resolve errors and retry import.',
        createdAt: '2026-04-09T18:00:00.000Z',
        updatedAt: '2026-04-09T18:00:00.000Z',
      })
    ).toEqual({
      tone: 'error',
      title: 'Dispatch stopped at preflight',
      details: [
        'This run did not reach the runtime queue because the preflight check failed.',
        'Catalog is required.',
      ],
    });
  });

  it('returns a zero-match diagnostic when no items were resolved', () => {
    expect(
      resolveImportRunDispatchDiagnostics({
        id: 'run-2',
        status: 'completed',
        params: {
          connectionId: 'conn-1',
          inventoryId: 'inv-1',
          catalogId: 'cat-1',
          imageMode: 'download',
          uniqueOnly: true,
          allowDuplicateSku: false,
          dryRun: false,
          mode: 'create_only',
        },
        dispatchMode: null,
        queueJobId: null,
        stats: {
          total: 0,
          pending: 0,
          processing: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        summaryMessage: 'No products matched current import filters.',
        createdAt: '2026-04-09T18:00:00.000Z',
        updatedAt: '2026-04-09T18:00:00.000Z',
      })
    ).toEqual({
      tone: 'warning',
      title: 'No products matched the current import filters',
      details: ['Nothing was queued because item resolution returned zero import candidates.'],
    });
  });

  it('returns an inline fallback diagnostic when dispatch mode is inline', () => {
    expect(
      resolveImportRunDispatchDiagnostics({
        id: 'run-3',
        status: 'running',
        params: {
          connectionId: 'conn-1',
          inventoryId: 'inv-1',
          catalogId: 'cat-1',
          imageMode: 'download',
          uniqueOnly: true,
          allowDuplicateSku: false,
          dryRun: false,
          mode: 'create_only',
        },
        dispatchMode: 'inline',
        queueJobId: 'inline-123',
        stats: {
          total: 10,
          pending: 10,
          processing: 0,
          imported: 0,
          updated: 0,
          skipped: 0,
          failed: 0,
        },
        summaryMessage: 'Import running inline.',
        createdAt: '2026-04-09T18:00:00.000Z',
        updatedAt: '2026-04-09T18:00:00.000Z',
      })
    ).toEqual({
      tone: 'warning',
      title: 'This run used inline fallback instead of BullMQ',
      details: [
        'Base imports use the separate base-import runtime queue.',
        'This run executed inline because Redis queueing was unavailable or enqueueing failed.',
      ],
    });
  });
});

describe('getImportRunErrorItems', () => {
  it('returns the most recent failed items first', () => {
    const items = getImportRunErrorItems([
      {
        id: 'item-1',
        runId: 'run-1',
        externalId: 'external-1',
        itemId: '111',
        sku: 'SKU-1',
        status: 'failed',
        errorMessage: 'Older failure',
        createdAt: '2026-04-09T18:00:00.000Z',
        updatedAt: '2026-04-09T18:00:05.000Z',
        finishedAt: '2026-04-09T18:00:05.000Z',
        attempt: 1,
      },
      {
        id: 'item-2',
        runId: 'run-1',
        externalId: 'external-2',
        itemId: '222',
        sku: 'SKU-2',
        status: 'failed',
        errorMessage: 'Newest failure',
        createdAt: '2026-04-09T18:00:00.000Z',
        updatedAt: '2026-04-09T18:00:20.000Z',
        finishedAt: '2026-04-09T18:00:20.000Z',
        attempt: 2,
      },
    ]);

    expect(items.map((item) => item.itemId)).toEqual(['222', '111']);
  });
});

describe('resolveImportRunRetryDiagnostics', () => {
  it('returns the next scheduled retry when pending retryable items exist', () => {
    expect(
      resolveImportRunRetryDiagnostics([
        {
          id: 'item-1',
          runId: 'run-1',
          externalId: 'external-1',
          itemId: '111',
          status: 'pending',
          retryable: true,
          nextRetryAt: '2026-04-09T18:00:20.000Z',
          createdAt: '2026-04-09T18:00:00.000Z',
          updatedAt: '2026-04-09T18:00:05.000Z',
          attempt: 1,
        },
        {
          id: 'item-2',
          runId: 'run-1',
          externalId: 'external-2',
          itemId: '222',
          status: 'pending',
          retryable: true,
          nextRetryAt: '2026-04-09T18:00:10.000Z',
          createdAt: '2026-04-09T18:00:00.000Z',
          updatedAt: '2026-04-09T18:00:06.000Z',
          attempt: 2,
        },
      ])
    ).toEqual({
      scheduledCount: 2,
      nextRetryAt: '2026-04-09T18:00:10.000Z',
    });
  });

  it('returns null when no scheduled retry items exist', () => {
    expect(
      resolveImportRunRetryDiagnostics([
        {
          id: 'item-1',
          runId: 'run-1',
          externalId: 'external-1',
          itemId: '111',
          status: 'failed',
          retryable: false,
          createdAt: '2026-04-09T18:00:00.000Z',
          updatedAt: '2026-04-09T18:00:05.000Z',
          attempt: 1,
        },
      ])
    ).toBeNull();
  });
});
