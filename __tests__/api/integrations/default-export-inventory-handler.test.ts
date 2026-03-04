import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_handler } from '@/app/api/v2/integrations/exports/base/default-inventory/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportDefaultInventoryIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportDefaultInventoryId: getExportDefaultInventoryIdMock,
  setExportDefaultInventoryId: vi.fn(),
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
});
