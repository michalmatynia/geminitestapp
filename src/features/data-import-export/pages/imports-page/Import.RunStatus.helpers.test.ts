import { describe, expect, it } from 'vitest';

import type { BaseImportItemRecord, BaseImportRunParameterImportSummary } from '@/shared/contracts/integrations/base-com';

import {
  buildParameterImportSummaryFromItems,
  compareImportItemsByLatestCompletion,
  getImportRunErrorItems,
  getParameterSyncHistoryItems,
  hasRetryableImportItems,
  resolveImportRunParameterImportSummary,
} from './Import.RunStatus.helpers';

const createItem = (overrides: Partial<BaseImportItemRecord> = {}): BaseImportItemRecord => ({
  id: overrides.id ?? 'item-1',
  runId: overrides.runId ?? 'run-1',
  externalId: overrides.externalId ?? 'ext-1',
  itemId: overrides.itemId ?? 'base-1',
  status: overrides.status ?? 'imported',
  createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
  updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
  attempt: overrides.attempt ?? 1,
  ...overrides,
});

describe('Import.RunStatus.helpers', () => {
  it('detects retryable items and limits visible error rows', () => {
    const items = [
      createItem({ id: 'item-1', status: 'imported' }),
      createItem({ id: 'item-2', status: 'failed', errorMessage: 'Failed to import' }),
      createItem({ id: 'item-3', status: 'pending', errorMessage: 'Queued again' }),
    ];

    expect(hasRetryableImportItems(items)).toBe(true);
    expect(getImportRunErrorItems(items, 1)).toEqual([
      expect.objectContaining({ id: 'item-2', errorMessage: 'Failed to import' }),
    ]);
  });

  it('uses the run summary when it already contains parameter activity', () => {
    const runSummary: BaseImportRunParameterImportSummary = {
      itemsApplied: 3,
      extracted: 7,
      resolved: 6,
      created: 2,
      written: 5,
    };

    expect(
      resolveImportRunParameterImportSummary(runSummary, [
        createItem({
          id: 'item-1',
          parameterImportSummary: { extracted: 1, resolved: 1, created: 1, written: 1 },
        }),
      ])
    ).toBe(runSummary);
  });

  it('aggregates and sanitizes item parameter summaries when the run summary is empty', () => {
    expect(
      buildParameterImportSummaryFromItems([
        createItem({
          id: 'item-1',
          parameterImportSummary: { extracted: 2.9, resolved: -1, created: 3, written: 4 },
        }),
        createItem({
          id: 'item-2',
          parameterImportSummary: {
            extracted: Number.NaN,
            resolved: 5.2,
            created: Number.POSITIVE_INFINITY,
            written: 1,
          },
        }),
      ])
    ).toEqual({
      itemsApplied: 2,
      extracted: 2,
      resolved: 5,
      created: 3,
      written: 5,
    });

    expect(
      resolveImportRunParameterImportSummary(
        {
          itemsApplied: 0,
          extracted: 0,
          resolved: 0,
          created: 0,
          written: 0,
        },
        [createItem({ parameterImportSummary: { extracted: 1, resolved: 2, created: 0, written: 3 } })]
      )
    ).toEqual({
      itemsApplied: 1,
      extracted: 1,
      resolved: 2,
      created: 0,
      written: 3,
    });
  });

  it('sorts recent parameter sync items by finished or updated timestamp and truncates history', () => {
    const items = [
      createItem({
        id: 'item-old',
        itemId: 'old',
        finishedAt: '2026-01-01T00:00:00.000Z',
        parameterImportSummary: { extracted: 1, resolved: 1, created: 1, written: 1 },
      }),
      createItem({
        id: 'item-new',
        itemId: 'new',
        finishedAt: '2026-01-03T00:00:00.000Z',
        parameterImportSummary: { extracted: 2, resolved: 2, created: 2, written: 2 },
      }),
      createItem({
        id: 'item-middle',
        itemId: 'middle',
        updatedAt: '2026-01-02T00:00:00.000Z',
        parameterImportSummary: { extracted: 3, resolved: 3, created: 3, written: 3 },
      }),
      createItem({ id: 'item-none', itemId: 'none' }),
    ];

    expect(compareImportItemsByLatestCompletion(items[0]!, items[1]!)).toBeGreaterThan(0);
    expect(getParameterSyncHistoryItems(items, 2).map((item: BaseImportItemRecord) => item.itemId)).toEqual([
      'new',
      'middle',
    ]);
  });
});
