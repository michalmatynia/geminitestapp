import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GET_handler,
  POST_handler,
} from '@/app/api/v2/integrations/exports/base/stock-fallback/handler';
import type { BaseStockFallbackPreferenceResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportStockFallbackEnabledMock = vi.hoisted(() => vi.fn());
const setExportStockFallbackEnabledMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportStockFallbackEnabled: getExportStockFallbackEnabledMock,
  setExportStockFallbackEnabled: setExportStockFallbackEnabledMock,
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const buildStockFallbackPostRequest = (enabled: boolean) =>
  new NextRequest('http://localhost/api/v2/integrations/exports/base/stock-fallback', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
    headers: { 'content-type': 'application/json' },
  });

describe('api/v2/integrations/exports/base/stock-fallback handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExportStockFallbackEnabledMock.mockResolvedValue(false);
    setExportStockFallbackEnabledMock.mockResolvedValue(undefined);
  });

  it('returns the stored stock fallback flag', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/stock-fallback', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as BaseStockFallbackPreferenceResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ enabled: false });
  });

  it('stores the stock fallback flag on POST and returns the centralized response', async () => {
    const response = await POST_handler(
      buildStockFallbackPostRequest(true),
      mockContext
    );
    const payload = (await response.json()) as BaseStockFallbackPreferenceResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ enabled: true });
    expect(setExportStockFallbackEnabledMock).toHaveBeenCalledWith(true);
  });
});
