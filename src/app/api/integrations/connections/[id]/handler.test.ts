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
  authMock,
  findAuthUserByIdMock,
  bcryptCompareMock,
} = vi.hoisted(() => {
  const parseJsonBodyMock = vi.fn();
  const getConnectionByIdMock = vi.fn();
  const getIntegrationByIdMock = vi.fn();
  const updateConnectionMock = vi.fn();
  const deleteConnectionMock = vi.fn();
  const authMock = vi.fn();
  const findAuthUserByIdMock = vi.fn();
  const bcryptCompareMock = vi.fn();
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
    authMock,
    findAuthUserByIdMock,
    bcryptCompareMock,
  };
});

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/integrations/server', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
  encryptSecret: (value: string): string => `enc:${value}`,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  findAuthUserById: findAuthUserByIdMock,
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: bcryptCompareMock,
  },
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
    authMock.mockResolvedValue({ user: { id: 'user-1' } });
    findAuthUserByIdMock.mockResolvedValue({
      id: 'user-1',
      email: 'admin@example.com',
      passwordHash: 'hashed-password',
    });
    bcryptCompareMock.mockResolvedValue(true);
  });

  it('allows empty username for Baselinker updates', async () => {
    const response = await PUT_handler({} as NextRequest, buildContext(), { id: 'conn-1' });
    const body = (await response.json()) as Record<string, unknown>;

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

    await expect(PUT_handler({} as NextRequest, buildContext(), { id: 'conn-1' })).rejects.toThrow(
      'Username is required for this integration.'
    );
    expect(updateConnectionMock).not.toHaveBeenCalled();
  });

  it('passes replacementConnectionId to delete repository call', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        userPassword: 'password-123',
      },
    });

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
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        userPassword: 'password-123',
      },
    });

    const request = {
      nextUrl: { searchParams: new URLSearchParams() },
    } as unknown as NextRequest;

    await DELETE_handler(request, buildContext(), { id: 'conn-1' });
    expect(deleteConnectionMock).toHaveBeenCalledWith('conn-1', {
      replacementConnectionId: undefined,
    });
  });

  it('rejects delete when password is invalid', async () => {
    parseJsonBodyMock.mockResolvedValueOnce({
      ok: true,
      data: {
        userPassword: 'bad-password',
      },
    });
    bcryptCompareMock.mockResolvedValueOnce(false);

    const request = {
      nextUrl: { searchParams: new URLSearchParams() },
    } as unknown as NextRequest;

    await expect(DELETE_handler(request, buildContext(), { id: 'conn-1' })).rejects.toThrow(
      'Invalid password.'
    );

    expect(deleteConnectionMock).not.toHaveBeenCalled();
  });
});
