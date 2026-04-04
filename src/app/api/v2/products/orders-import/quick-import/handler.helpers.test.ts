import { describe, expect, it } from 'vitest';

import type {
  BaseOrderImportPersistResponse,
  BaseOrderImportPreviewResponse,
} from '@/shared/contracts/products';

import {
  buildQuickImportNoopResponse,
  buildQuickImportPersistedResponse,
  countSkippedImportedPreviewOrders,
  listImportablePreviewOrders,
} from './handler.helpers';

const preview: BaseOrderImportPreviewResponse = {
  orders: [
    { baseOrderId: '1001', importState: 'new' } as never,
    { baseOrderId: '1002', importState: 'changed' } as never,
    { baseOrderId: '1003', importState: 'imported' } as never,
  ],
  stats: {
    total: 3,
    newCount: 1,
    importedCount: 1,
    changedCount: 1,
  },
};

describe('product orders-import quick-import handler helpers', () => {
  it('lists only new and changed preview orders', () => {
    expect(listImportablePreviewOrders(preview)).toEqual([
      { baseOrderId: '1001', importState: 'new' },
      { baseOrderId: '1002', importState: 'changed' },
    ]);
    expect(countSkippedImportedPreviewOrders(preview)).toBe(1);
  });

  it('builds the no-op quick import response', () => {
    expect(buildQuickImportNoopResponse(preview)).toEqual({
      preview,
      importableCount: 0,
      skippedImportedCount: 1,
      importedCount: 0,
      createdCount: 0,
      updatedCount: 0,
      syncedAt: null,
      results: [],
    });
  });

  it('builds the persisted quick import response', () => {
    const patchedPreview: BaseOrderImportPreviewResponse = {
      ...preview,
      orders: preview.orders.map((order) => ({ ...order, importState: 'imported' })),
      stats: {
        total: 3,
        newCount: 0,
        importedCount: 3,
        changedCount: 0,
      },
    };
    const importResult: BaseOrderImportPersistResponse = {
      createdCount: 1,
      updatedCount: 1,
      syncedAt: '2026-03-27T12:00:00.000Z',
      results: [
        { baseOrderId: '1001', result: 'created' },
        { baseOrderId: '1002', result: 'updated' },
      ],
      importedCount: 2,
    };

    expect(
      buildQuickImportPersistedResponse({
        preview,
        patchedPreview,
        importableOrders: listImportablePreviewOrders(preview),
        importResult,
      })
    ).toEqual({
      preview: patchedPreview,
      importableCount: 2,
      skippedImportedCount: 1,
      importedCount: 2,
      createdCount: 1,
      updatedCount: 1,
      syncedAt: '2026-03-27T12:00:00.000Z',
      results: [
        { baseOrderId: '1001', result: 'created' },
        { baseOrderId: '1002', result: 'updated' },
      ],
    });
  });
});
