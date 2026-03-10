import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GET_handler,
  POST_handler,
} from '@/app/api/v2/integrations/exports/base/default-connection/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());
const setExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportDefaultConnectionId: getExportDefaultConnectionIdMock,
  setExportDefaultConnectionId: setExportDefaultConnectionIdMock,
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

type DefaultExportConnectionResponse = {
  connectionId: string | null;
};

describe('api/v2/integrations/exports/base/default-connection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExportDefaultConnectionIdMock.mockResolvedValue(null);
    setExportDefaultConnectionIdMock.mockResolvedValue(undefined);
  });

  it('returns null when no default connection is stored', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: null });
  });

  it('returns stored connection id as-is', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('conn-valid');

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-valid' });
    expect(setExportDefaultConnectionIdMock).not.toHaveBeenCalled();
  });

  it('normalizes empty stored connection id to null', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('   ');

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: null });
    expect(setExportDefaultConnectionIdMock).not.toHaveBeenCalled();
  });

  it('returns null when reading default connection setting throws unexpectedly', async () => {
    getExportDefaultConnectionIdMock.mockRejectedValue(new Error('settings read failed'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: null });
  });

  it('stores normalized connection id on POST and returns the centralized response', async () => {
    const response = await POST_handler(
      new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
        method: 'POST',
        body: JSON.stringify({ connectionId: '  conn-new  ' }),
        headers: { 'content-type': 'application/json' },
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-new' });
    expect(setExportDefaultConnectionIdMock).toHaveBeenCalledWith('conn-new');
  });
});
