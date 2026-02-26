import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  parseJsonBodyMock,
  getIntegrationByIdMock,
  createConnectionMock,
  getIntegrationRepositoryMock,
  encryptSecretMock,
} = vi.hoisted(() => {
  const parseJsonBodyMock = vi.fn();
  const getIntegrationByIdMock = vi.fn();
  const createConnectionMock = vi.fn();
  const getIntegrationRepositoryMock = vi.fn().mockResolvedValue({
    getIntegrationById: getIntegrationByIdMock,
    createConnection: createConnectionMock,
  });
  const encryptSecretMock = vi.fn((value: string) => `enc:${value}`);

  return {
    parseJsonBodyMock,
    getIntegrationByIdMock,
    createConnectionMock,
    getIntegrationRepositoryMock,
    encryptSecretMock,
  };
});

vi.mock('@/features/products/server', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: getIntegrationRepositoryMock,
  encryptSecret: encryptSecretMock,
}));

import { POST_handler } from './handler';

const buildContext = (): ApiHandlerContext =>
  ({
    requestId: 'req-integrations-create-connection',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as ApiHandlerContext;

describe('integrations/[id]/connections POST handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        name: 'Base Main',
        password: 'token-123',
      },
    });

    getIntegrationByIdMock.mockResolvedValue({
      id: 'int-base',
      slug: 'baselinker',
      name: 'Baselinker',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    createConnectionMock.mockResolvedValue({
      id: 'conn-1',
      integrationId: 'int-base',
      name: 'Base Main',
      username: '',
      password: 'enc:token-123',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });
  });

  it('allows empty username for Baselinker', async () => {
    const response = await POST_handler(
      {} as NextRequest,
      buildContext(),
      { id: 'int-base' }
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(createConnectionMock).toHaveBeenCalledWith(
      'int-base',
      expect.objectContaining({
        name: 'Base Main',
        username: '',
        password: 'enc:token-123',
      })
    );
    expect(body['username']).toBe('');
  });

  it('rejects empty username for non-Baselinker integrations', async () => {
    getIntegrationByIdMock.mockResolvedValueOnce({
      id: 'int-allegro',
      slug: 'allegro',
      name: 'Allegro',
      createdAt: new Date().toISOString(),
      updatedAt: null,
    });

    await expect(
      POST_handler({} as NextRequest, buildContext(), { id: 'int-allegro' })
    ).rejects.toThrow('Username is required for this integration.');
    expect(createConnectionMock).not.toHaveBeenCalled();
  });
});

