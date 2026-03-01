import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET_handler } from '@/app/api/integrations/exports/base/default-connection/handler';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const getExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());
const setExportDefaultConnectionIdMock = vi.hoisted(() => vi.fn());
const listIntegrationsMock = vi.hoisted(() => vi.fn());
const listConnectionsMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/integrations/server', () => ({
  getExportDefaultConnectionId: getExportDefaultConnectionIdMock,
  setExportDefaultConnectionId: setExportDefaultConnectionIdMock,
  getIntegrationRepository: vi.fn(async () => ({
    listIntegrations: listIntegrationsMock,
    listConnections: listConnectionsMock,
  })),
}));

const mockContext: ApiHandlerContext = {
  requestId: 'test-req-id',
  startTime: Date.now(),
  getElapsedMs: () => 0,
};

type DefaultExportConnectionResponse = {
  connectionId: string | null;
};

describe('api/integrations/exports/base/default-connection handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getExportDefaultConnectionIdMock.mockResolvedValue(null);
    setExportDefaultConnectionIdMock.mockResolvedValue(undefined);
    listIntegrationsMock.mockResolvedValue([]);
    listConnectionsMock.mockResolvedValue([]);
  });

  it('returns null when no default connection is stored', async () => {
    const response = await GET_handler(
      new NextRequest('http://localhost/api/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: null });
    expect(listIntegrationsMock).not.toHaveBeenCalled();
  });

  it('keeps stored connection when it exists and has Base credentials', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('conn-valid');
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-base', slug: 'base-com' }]);
    listConnectionsMock.mockResolvedValue([
      { id: 'conn-valid', integrationId: 'integration-base', baseApiToken: 'token', password: '' },
      { id: 'conn-other', integrationId: 'integration-base', baseApiToken: null, password: '' },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-valid' });
    expect(setExportDefaultConnectionIdMock).not.toHaveBeenCalled();
  });

  it('recovers stale stored connection by falling back to an available Base connection', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('conn-stale');
    listIntegrationsMock.mockResolvedValue([{ id: 'integration-base', slug: 'base-com' }]);
    listConnectionsMock.mockResolvedValue([
      { id: 'conn-no-token', integrationId: 'integration-base', baseApiToken: null, password: '' },
      {
        id: 'conn-fallback',
        integrationId: 'integration-base',
        baseApiToken: 'token',
        password: '',
      },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-fallback' });
    expect(setExportDefaultConnectionIdMock).toHaveBeenCalledWith('conn-fallback');
  });

  it('returns stored value when connection resolution fails unexpectedly', async () => {
    getExportDefaultConnectionIdMock.mockResolvedValue('conn-keep');
    listIntegrationsMock.mockRejectedValue(new Error('repository offline'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: 'conn-keep' });
    expect(setExportDefaultConnectionIdMock).not.toHaveBeenCalled();
  });

  it('returns null when reading default connection setting throws unexpectedly', async () => {
    getExportDefaultConnectionIdMock.mockRejectedValue(new Error('settings read failed'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/integrations/exports/base/default-connection', {
        method: 'GET',
      }),
      mockContext
    );
    const payload = (await response.json()) as DefaultExportConnectionResponse;

    expect(response.status).toBe(200);
    expect(payload).toEqual({ connectionId: null });
    expect(listIntegrationsMock).not.toHaveBeenCalled();
  });
});
