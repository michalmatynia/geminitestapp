import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  parseJsonBodyMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
  updateConnectionMock,
  deleteConnectionMock,
  getIntegrationRepositoryMock,
} = vi.hoisted(() => {
  const parseJsonBodyMock = vi.fn();
  const getConnectionByIdMock = vi.fn();
  const getIntegrationByIdMock = vi.fn();
  const updateConnectionMock = vi.fn();
  const deleteConnectionMock = vi.fn();
  const getIntegrationRepositoryMock = vi.fn().mockResolvedValue({
    getConnectionById: getConnectionByIdMock,
    getIntegrationById: getIntegrationByIdMock,
    updateConnection: updateConnectionMock,
    deleteConnection: deleteConnectionMock,
  });

  return {
    parseJsonBodyMock,
    getConnectionByIdMock,
    getIntegrationByIdMock,
    updateConnectionMock,
    deleteConnectionMock,
    getIntegrationRepositoryMock,
  };
});

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
  encryptSecret: (value: string): string => `enc:${value}`,
}));

import { DELETE_handler, PUT_handler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-integrations-update-connection',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('integrations/connections/[id] PUT handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Updated Connection',
        username: '',
      },
    });

    getConnectionByIdMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-base',
      name: 'Updated Connection',
      username: '',
      password: 'enc:token-1',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    getIntegrationByIdMock.mockResolvedValue({
      id: 'int-base',
      slug: 'baselinker',
      name: 'Baselinker',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    updateConnectionMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-base',
      name: 'Updated Connection',
      username: '',
      createdAt: new Date().toISOString(),
      updatedAt: null,
      allegroUseSandbox: false,
      traderaDefaultTemplateId: null,
      traderaDefaultDurationHours: 72,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: 180,
      traderaApiAppId: null,
      traderaApiPublicKey: null,
      traderaApiUserId: null,
      traderaApiSandbox: false,
      traderaApiTokenUpdatedAt: null,
    });

    deleteConnectionMock.mockResolvedValue(undefined);
  });

  it('allows empty username for Baselinker updates', async () => {
    const response = await PUT_handler(
      {} as NextRequest,
      buildContext(),
      { id: 'conn-1' }
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(updateConnectionMock).toHaveBeenCalledWith(
      'conn-1',
      expect.objectContaining({
        name: 'Updated Connection',
        username: '',
      })
    );
    expect(body['username']).toBe('');
  });

  it('rejects empty username for non-Baselinker updates', async () => {
    getIntegrationByIdMock.mockResolvedValueOnce({
      id: 'int-allegro',
      slug: 'allegro',
      name: 'Allegro',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    await expect(
      PUT_handler({} as NextRequest, buildContext(), { id: 'conn-1' })
    ).rejects.toThrow('Username is required for this integration.');
    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('passes replacementConnectionId to delete repository call', async () => {
    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({
          replacementConnectionId: 'conn-2',
        }),
      },
    } as unknown as NextRequest;

    const response = await DELETE_handler(request, buildContext(), { id: 'conn-1' });
    expect(response.status).toBe(204);
    expect(deleteConnectionMock).toHaveBeenCalledWith('conn-1', {
      replacementConnectionId: 'conn-2',
    });
  });

  it('passes undefined replacementConnectionId when not provided', async () => {
    const request = {
      nextUrl: { searchParams: new URLSearchParams() },
    } as unknown as NextRequest;

    await DELETE_handler(request, buildContext(), { id: 'conn-1' });
    expect(deleteConnectionMock).toHaveBeenCalledWith('conn-1', {
      replacementConnectionId: undefined,
    });
  });
});
