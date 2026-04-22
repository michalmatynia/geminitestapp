import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getActiveTemplateHandlerMock,
  postActiveTemplateHandlerMock,
  getDefaultInventoryHandlerMock,
  postDefaultInventoryHandlerMock,
  getStockFallbackHandlerMock,
  postStockFallbackHandlerMock,
  getDefaultConnectionHandlerMock,
  postDefaultConnectionHandlerMock,
  getExportWarehouseHandlerMock,
  postExportWarehouseHandlerMock,
  getImageRetryPresetsHandlerMock,
  postImageRetryPresetsHandlerMock,
} = vi.hoisted(() => ({
  getActiveTemplateHandlerMock: vi.fn(),
  postActiveTemplateHandlerMock: vi.fn(),
  getDefaultInventoryHandlerMock: vi.fn(),
  postDefaultInventoryHandlerMock: vi.fn(),
  getStockFallbackHandlerMock: vi.fn(),
  postStockFallbackHandlerMock: vi.fn(),
  getDefaultConnectionHandlerMock: vi.fn(),
  postDefaultConnectionHandlerMock: vi.fn(),
  getExportWarehouseHandlerMock: vi.fn(),
  postExportWarehouseHandlerMock: vi.fn(),
  getImageRetryPresetsHandlerMock: vi.fn(),
  postImageRetryPresetsHandlerMock: vi.fn(),
}));

vi.mock('@/app/api/v2/integrations/exports/base/active-template/handler', () => ({
  getHandler: (...args: unknown[]) => getActiveTemplateHandlerMock(...args),
  postHandler: (...args: unknown[]) => postActiveTemplateHandlerMock(...args),
}));

vi.mock('@/app/api/v2/integrations/exports/base/default-connection/handler', () => ({
  getHandler: (...args: unknown[]) => getDefaultConnectionHandlerMock(...args),
  postHandler: (...args: unknown[]) => postDefaultConnectionHandlerMock(...args),
}));

vi.mock('@/app/api/v2/integrations/exports/base/default-inventory/handler', () => ({
  getHandler: (...args: unknown[]) => getDefaultInventoryHandlerMock(...args),
  postHandler: (...args: unknown[]) => postDefaultInventoryHandlerMock(...args),
}));

vi.mock('@/app/api/v2/integrations/exports/base/export-warehouse/handler', () => ({
  getHandler: (...args: unknown[]) => getExportWarehouseHandlerMock(...args),
  postHandler: (...args: unknown[]) => postExportWarehouseHandlerMock(...args),
}));

vi.mock('@/app/api/v2/integrations/exports/base/image-retry-presets/handler', () => ({
  getHandler: (...args: unknown[]) => getImageRetryPresetsHandlerMock(...args),
  postHandler: (...args: unknown[]) => postImageRetryPresetsHandlerMock(...args),
}));

vi.mock('@/app/api/v2/integrations/exports/base/stock-fallback/handler', () => ({
  getHandler: (...args: unknown[]) => getStockFallbackHandlerMock(...args),
  postHandler: (...args: unknown[]) => postStockFallbackHandlerMock(...args),
}));

import { getHandler, postHandler, querySchema } from './handler';

describe('base export setting handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates GET requests to the default-inventory handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'exports-default-inventory-get' });
    getDefaultInventoryHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await getHandler(request, context, { setting: 'default-inventory' });

    expect(getDefaultInventoryHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('delegates POST requests to the stock-fallback handler', async () => {
    const request = {} as never;
    const context = {} as never;
    const delegatedResponse = NextResponse.json({ source: 'exports-stock-fallback-post' });
    postStockFallbackHandlerMock.mockResolvedValue(delegatedResponse);

    const response = await postHandler(request, context, { setting: 'stock-fallback' });

    expect(postStockFallbackHandlerMock).toHaveBeenCalledWith(request, context);
    expect(response).toBe(delegatedResponse);
  });

  it('rejects unknown export setting names', async () => {
    await expect(postHandler({} as never, {} as never, { setting: 'unknown' })).rejects.toThrow(
      'Unknown exports/base setting: unknown'
    );
  });

  it('reuses the shared trimmed query schema', () => {
    expect(
      querySchema.parse({
        connectionId: '  conn-2  ',
        inventoryId: '  inv-2  ',
      })
    ).toEqual({
      connectionId: 'conn-2',
      inventoryId: 'inv-2',
    });
  });
});
