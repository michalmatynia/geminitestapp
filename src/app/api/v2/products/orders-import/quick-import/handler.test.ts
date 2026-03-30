import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadBaseOrderImportPreviewMock: vi.fn(),
  markPreviewOrdersAsImportedMock: vi.fn(),
  getProductOrdersImportRepositoryMock: vi.fn(),
  upsertOrdersMock: vi.fn(),
}));

vi.mock('@/features/products/server/product-orders-import-preview', () => ({
  loadBaseOrderImportPreview: (...args: unknown[]) => mocks.loadBaseOrderImportPreviewMock(...args),
  markPreviewOrdersAsImported: (...args: unknown[]) => mocks.markPreviewOrdersAsImportedMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  getProductOrdersImportRepository: (...args: unknown[]) => mocks.getProductOrdersImportRepositoryMock(...args),
}));

import { POST_handler, quickImportOrdersImportSchema } from './handler';

const makeRequest = (): NextRequest =>
  new NextRequest('http://localhost/api/v2/products/orders-import/quick-import', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({}),
  });

describe('product orders-import quick import handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upsertOrdersMock.mockResolvedValue({
      createdCount: 1,
      updatedCount: 1,
      syncedAt: '2026-03-27T12:00:00.000Z',
      results: [
        { baseOrderId: '1001', result: 'created' },
        { baseOrderId: '1002', result: 'updated' },
      ],
    });
    mocks.getProductOrdersImportRepositoryMock.mockResolvedValue({
      upsertOrders: mocks.upsertOrdersMock,
    });
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof quickImportOrdersImportSchema.safeParse).toBe('function');
  });

  it('imports only new and changed preview orders', async () => {
    const preview = {
      orders: [
        { baseOrderId: '1001', importState: 'new' },
        { baseOrderId: '1002', importState: 'changed' },
        { baseOrderId: '1003', importState: 'imported' },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    const patchedPreview = {
      orders: [
        { baseOrderId: '1001', importState: 'imported' },
        { baseOrderId: '1002', importState: 'imported' },
        { baseOrderId: '1003', importState: 'imported' },
      ],
      stats: {
        total: 3,
        newCount: 0,
        importedCount: 3,
        changedCount: 0,
      },
    };
    mocks.loadBaseOrderImportPreviewMock.mockResolvedValue(preview);
    mocks.markPreviewOrdersAsImportedMock.mockReturnValue(patchedPreview);

    const response = await POST_handler(makeRequest(), {
      body: {
        connectionId: 'conn-1',
        limit: 50,
      },
    } as never);

    expect(mocks.upsertOrdersMock).toHaveBeenCalledWith('conn-1', [
      { baseOrderId: '1001', importState: 'new' },
      { baseOrderId: '1002', importState: 'changed' },
    ]);
    expect(mocks.markPreviewOrdersAsImportedMock).toHaveBeenCalledWith(preview, '2026-03-27T12:00:00.000Z', [
      '1001',
      '1002',
    ]);

    await expect(response.json()).resolves.toEqual({
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

  it('returns a no-op result when preview contains only imported orders', async () => {
    const preview = {
      orders: [{ baseOrderId: '1003', importState: 'imported' }],
      stats: {
        total: 1,
        newCount: 0,
        importedCount: 1,
        changedCount: 0,
      },
    };
    mocks.loadBaseOrderImportPreviewMock.mockResolvedValue(preview);

    const response = await POST_handler(makeRequest(), {
      body: {
        connectionId: 'conn-1',
        limit: 50,
      },
    } as never);

    expect(mocks.upsertOrdersMock).not.toHaveBeenCalled();
    expect(mocks.markPreviewOrdersAsImportedMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
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
});
