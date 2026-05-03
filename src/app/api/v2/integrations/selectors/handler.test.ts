import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  deleteSelectorRegistryEntryMock,
  listSelectorRegistryMock,
  mutateSelectorRegistryProfileMock,
  saveSelectorRegistryEntryMock,
  syncSelectorRegistryFromCodeMock,
} = vi.hoisted(() => ({
  deleteSelectorRegistryEntryMock: vi.fn(),
  listSelectorRegistryMock: vi.fn(),
  mutateSelectorRegistryProfileMock: vi.fn(),
  saveSelectorRegistryEntryMock: vi.fn(),
  syncSelectorRegistryFromCodeMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/selector-registry', () => ({
  deleteSelectorRegistryEntry: (...args: unknown[]) => deleteSelectorRegistryEntryMock(...args),
  listSelectorRegistry: (...args: unknown[]) => listSelectorRegistryMock(...args),
  mutateSelectorRegistryProfile: (...args: unknown[]) =>
    mutateSelectorRegistryProfileMock(...args),
  saveSelectorRegistryEntry: (...args: unknown[]) => saveSelectorRegistryEntryMock(...args),
  syncSelectorRegistryFromCode: (...args: unknown[]) => syncSelectorRegistryFromCodeMock(...args),
}));

import { getHandler, patchHandler } from './handler';

const createContext = (body: Record<string, unknown>): ApiHandlerContext =>
  ({
    requestId: 'request-selector-registry-1',
    traceId: 'trace-selector-registry-1',
    correlationId: 'corr-selector-registry-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    body,
  }) as ApiHandlerContext;

describe('selector-registry handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSelectorRegistryMock.mockResolvedValue({
      entries: [],
      probeSessions: [],
      probeSessionClusters: [],
      profileMetadata: {
        namespace: 'custom',
        profile: 'example_shop_com',
        probeOrigin: 'https://www.example-shop.com',
        probePathHint: '/item',
        probeUrl: 'https://www.example-shop.com/item',
        updatedAt: '2026-04-18T12:30:00.000Z',
      },
      namespaces: ['custom'],
      profiles: ['example_shop_com'],
      namespace: 'custom',
      profile: 'example_shop_com',
      defaultProfile: 'custom',
      total: 0,
      syncedAt: null,
    });
    mutateSelectorRegistryProfileMock.mockResolvedValue({
      namespace: 'custom',
      action: 'set_probe_url',
      profile: 'example_shop_com',
      targetProfile: null,
      probeOrigin: 'https://www.example-shop.com',
      probePathHint: '/item',
      probeUrl: 'https://www.example-shop.com/item',
      affectedEntries: 0,
      message: 'Saved probe site URL for custom selector registry "example_shop_com".',
    });
  });

  it('returns profile metadata in selector-registry GET responses', async () => {
    const response = await getHandler(
      new NextRequest(
        'http://localhost/api/v2/integrations/selectors?namespace=custom&profile=example_shop_com'
      ),
      createContext({})
    );

    expect(listSelectorRegistryMock).toHaveBeenCalledWith({
      namespace: 'custom',
      profile: 'example_shop_com',
      effective: undefined,
      includeArchived: undefined,
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        profileMetadata: expect.objectContaining({
          probeOrigin: 'https://www.example-shop.com',
          probePathHint: '/item',
          probeUrl: 'https://www.example-shop.com/item',
        }),
      })
    );
  });

  it('forwards set_probe_url profile actions through PATCH', async () => {
    const body = {
      action: 'set_probe_url',
      namespace: 'custom',
      profile: 'example_shop_com',
      probeUrl: 'https://www.example-shop.com/item/123',
    };

    const response = await patchHandler(
      new NextRequest('http://localhost/api/v2/integrations/selectors', {
        method: 'PATCH',
      }),
      createContext(body)
    );

    expect(mutateSelectorRegistryProfileMock).toHaveBeenCalledWith(body);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        action: 'set_probe_url',
        probeOrigin: 'https://www.example-shop.com',
        probePathHint: '/item',
        probeUrl: 'https://www.example-shop.com/item',
      })
    );
  });
});
