import { describe, expect, it } from 'vitest';

import { buildBaseOrderQuickImportFeedback } from './base-order-quick-import-feedback';

describe('buildBaseOrderQuickImportFeedback', () => {
  it('builds the success summary and omits the skipped suffix when nothing was skipped', () => {
    expect(
      buildBaseOrderQuickImportFeedback({
        preview: {
          orders: [],
          stats: {
            total: 1,
            newCount: 0,
            importedCount: 1,
            changedCount: 0,
          },
        },
        importableCount: 1,
        skippedImportedCount: 0,
        importedCount: 2,
        createdCount: 1,
        updatedCount: 1,
        syncedAt: '2026-03-27T10:00:00.000Z',
        results: [],
      })
    ).toEqual({
      variant: 'success',
      message: 'Imported 2 orders from Base.com. Created 1, updated 1.',
    });
  });

  it('builds the empty-scope info summary', () => {
    expect(
      buildBaseOrderQuickImportFeedback({
        preview: {
          orders: [],
          stats: {
            total: 0,
            newCount: 0,
            importedCount: 0,
            changedCount: 0,
          },
        },
        importableCount: 0,
        skippedImportedCount: 0,
        importedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        syncedAt: null,
        results: [],
      })
    ).toEqual({
      variant: 'info',
      message: 'No Base.com orders matched the current import scope.',
    });
  });

  it('builds the already-imported info summary when nothing new or changed remains', () => {
    expect(
      buildBaseOrderQuickImportFeedback({
        preview: {
          orders: [],
          stats: {
            total: 4,
            newCount: 0,
            importedCount: 4,
            changedCount: 0,
          },
        },
        importableCount: 0,
        skippedImportedCount: 4,
        importedCount: 0,
        createdCount: 0,
        updatedCount: 0,
        syncedAt: null,
        results: [],
      })
    ).toEqual({
      variant: 'info',
      message: 'No new or changed orders to import. Loaded 4 orders and skipped 4 already imported.',
    });
  });
});
