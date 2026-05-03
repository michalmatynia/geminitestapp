import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getHandler,
  postHandler,
} from '@/app/api/v2/integrations/exports/base/default-connection/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());
const setExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());
const setExportDefaultInventoryIdMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportDefaultConnectionId: getExportDefaultConnectionIdMock,
  setExportDefaultConnectionId: setExportDefaultConnectionIdMock,
  setExportDefaultInventoryId: setExportDefaultInventoryIdMock,
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

const buildDefaultConnectionPostRequest = (connectionId: string) =>
  new NextRequest('http://localhost/api/v2/integrations/exports/base/default-connection', {
    method: 'POST',
    body: JSON.stringify({ connectionId }),
    headers: { 'content-type': 'application/json' },
  });

type DefaultExportConnectionResponse = {
  connectionId: string | null;
};

describe('api/v2/integrations/exports/base/default-connection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExportDefaultConnectionIdMock.mockResolvedValue(null);
    setExportDefaultConnectionIdMock.mockResolvedValue(undefined);
    setExportDefaultInventoryIdMock.mockResolvedValue(undefined);
  });

  it('returns null when no default connection is stored', async () => {
    const response = await getHandler(
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

    const response = await getHandler(
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

    const response = await getHandler(
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

    const response = await getHandler(
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
    const response = await postHandler(
      buildDefaultConnectionPostRequest('  conn-new  '),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-new' });
    expect(setExportDefaultInventoryIdMock).toHaveBeenCalledWith(null);
    expect(setExportDefaultConnectionIdMock).toHaveBeenCalledWith('conn-new');
  });

  it('does not clear default inventory when saving the same connection id again', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('conn-existing');

    const response = await postHandler(
      buildDefaultConnectionPostRequest('conn-existing'),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-existing' });
    expect(setExportDefaultInventoryIdMock).not.toHaveBeenCalled();
    expect(setExportDefaultConnectionIdMock).toHaveBeenCalledWith('conn-existing');
  });

  it('still stores the new connection when reading the previous value fails', async () => {
    getExportDefaultConnectionIdMock.mockRejectedValue(new Error('settings read failed'));

    const response = await postHandler(
      buildDefaultConnectionPostRequest('conn-new'),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-new' });
    expect(setExportDefaultInventoryIdMock).toHaveBeenCalledWith(null);
    expect(setExportDefaultConnectionIdMock).toHaveBeenCalledWith('conn-new');
  });
});
