import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GET_handler,
  POST_handler,
} from '@/app/api/v2/integrations/exports/base/default-inventory/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportDefaultInventoryIdMock = vi.hoisted(() => vi.fn());
const setExportDefaultInventoryIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportDefaultInventoryId: getExportDefaultInventoryIdMock,
  setExportDefaultInventoryId: setExportDefaultInventoryIdMock,
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

type DefaultExportInventoryResponse = {
  inventoryId: string | null;
};

describe('api/v2/integrations/exports/base/default-inventory handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setExportDefaultInventoryIdMock.mockResolvedValue(undefined);
  });

  it('returns stored default inventory id', async () => {
    getExportDefaultInventoryIdMock.mockResolvedValue('4069');

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-inventory', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportInventoryResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ inventoryId: '4069' });
  });

  it('returns null when reading default inventory throws unexpectedly', async () => {
    getExportDefaultInventoryIdMock.mockRejectedValue(new Error('settings read failed'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-inventory', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportInventoryResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ inventoryId: null });
  });

  it('stores inventory id on POST and returns the centralized response', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-inventory', {
        method: 'POST',
        body: JSON.stringify({ inventoryId: '4069' }),
        headers: { 'content-type': 'application/json' },
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportInventoryResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ inventoryId: '4069' });
    expect(setExportDefaultInventoryIdMock).toHaveBeenCalledWith('4069');
  });
});
