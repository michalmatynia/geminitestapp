import { NextRequest } from 'next/server';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  getProductBaseSyncPreviewMock,
  runProductBaseSyncMock,
} = vi.hoisted(() => ({
  getProductBaseSyncPreviewMock: vi.fn(),
  runProductBaseSyncMock: vi.fn(),
}));

vi.mock('@/features/product-sync/services/product-sync-service', () => ({
  getProductBaseSyncPreview: (...args: unknown[]) => getProductBaseSyncPreviewMock(...args),
  runProductBaseSync: (...args: unknown[]) => runProductBaseSyncMock(...args),
}));

import { getHandler, postHandler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-product-base-sync-handler',
    startTime: Date.now(),
    userId: 'user-1',
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('products/[id]/sync/base handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the manual Base sync preview for GET requests', async () => {
    getProductBaseSyncPreviewMock.mockResolvedValue({
      status: 'ready',
      canSync: true,
      disabledReason: null,
      profile: {
        id: 'profile-1',
        name: 'Base Product Sync',
        isDefault: true,
        enabled: true,
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: null,
        lastRunAt: null,
      },
      linkedBaseProductId: 'base-123',
      resolvedTargetSource: 'product',
      fields: [],
    });

    const response = await getHandler({} as NextRequest, buildContext(), { id: ' product-1 ' });

    expect(getProductBaseSyncPreviewMock).toHaveBeenCalledWith('product-1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      status: 'ready',
      linkedBaseProductId: 'base-123',
    });
  });

  it('rejects POST when the preview says sync is unavailable', async () => {
    getProductBaseSyncPreviewMock.mockResolvedValue({
      status: 'missing_base_link',
      canSync: false,
      disabledReason: 'This product is not linked to Base.com.',
      profile: null,
      linkedBaseProductId: null,
      resolvedTargetSource: 'none',
      fields: [],
    });

    await expect(
      postHandler({} as NextRequest, buildContext(), { id: 'product-1' })
    ).rejects.toThrow('This product is not linked to Base.com.');

    expect(runProductBaseSyncMock).not.toHaveBeenCalled();
  });

  it('runs the product Base sync for POST requests when the preview allows it', async () => {
    getProductBaseSyncPreviewMock.mockResolvedValue({
      status: 'ready',
      canSync: true,
      disabledReason: null,
      profile: {
        id: 'profile-1',
        name: 'Base Product Sync',
        isDefault: true,
        enabled: true,
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: null,
        lastRunAt: null,
      },
      linkedBaseProductId: 'base-123',
      resolvedTargetSource: 'product',
      fields: [],
    });
    runProductBaseSyncMock.mockResolvedValue({
      preview: {
        status: 'ready',
        canSync: true,
        disabledReason: null,
        profile: {
          id: 'profile-1',
          name: 'Base Product Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: null,
          lastRunAt: null,
        },
        linkedBaseProductId: 'base-123',
        resolvedTargetSource: 'product',
        fields: [],
      },
      result: {
        status: 'success',
        localChanges: ['stock'],
        baseChanges: [],
        message: 'Synchronized successfully.',
        errorMessage: null,
      },
    });

    const response = await postHandler({} as NextRequest, buildContext(), { id: 'product-1' });

    expect(getProductBaseSyncPreviewMock).toHaveBeenCalledWith('product-1');
    expect(runProductBaseSyncMock).toHaveBeenCalledWith('product-1');
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    await expect(response.json()).resolves.toMatchObject({
      result: {
        status: 'success',
        localChanges: ['stock'],
      },
    });
  });
});
