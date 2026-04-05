import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveBaseConnectionTokenMock } = vi.hoisted(() => ({
  resolveBaseConnectionTokenMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  resolveBaseConnectionToken: resolveBaseConnectionTokenMock,
}));

import {
  buildEmptyMarketplaceProducerFetchResponse,
  buildMarketplaceProducerFetchResponse,
  requireMarketplaceConnectionId,
  resolveBaseMarketplaceProducerFetchContext,
  type ProducerFetchIntegrationRepository,
} from './handler.helpers';

describe('marketplace producers fetch helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveBaseConnectionTokenMock.mockReturnValue({
      token: 'base-token',
      source: 'baseApiToken',
      error: null,
    });
  });

  it('requires a non-empty connection id', () => {
    expect(requireMarketplaceConnectionId({ connectionId: 'conn-1' })).toBe('conn-1');
    expect(() => requireMarketplaceConnectionId({ connectionId: '' })).toThrow(
      'connectionId is required'
    );
  });

  it('resolves a base marketplace producer fetch context with token and inventory', async () => {
    const integrationRepo: ProducerFetchIntegrationRepository = {
      getConnectionById: vi.fn().mockResolvedValue({
        integrationId: 'int-1',
        baseApiToken: 'encrypted-token',
        baseLastInventoryId: 'inventory-1',
      }),
      getIntegrationById: vi.fn().mockResolvedValue({
        slug: 'Base',
      }),
    };

    await expect(
      resolveBaseMarketplaceProducerFetchContext(integrationRepo, 'conn-1')
    ).resolves.toEqual({
      connectionId: 'conn-1',
      inventoryId: 'inventory-1',
      token: 'base-token',
    });
  });

  it('builds empty and success responses and rejects unsupported integrations', async () => {
    const integrationRepo: ProducerFetchIntegrationRepository = {
      getConnectionById: vi.fn().mockResolvedValue({
        integrationId: 'int-2',
        baseApiToken: 'encrypted-token',
        baseLastInventoryId: null,
      }),
      getIntegrationById: vi.fn().mockResolvedValue({
        slug: 'tradera',
      }),
    };

    await expect(
      resolveBaseMarketplaceProducerFetchContext(integrationRepo, 'conn-2')
    ).rejects.toThrow('Only Base.com connections are supported for producer fetch');

    expect(buildEmptyMarketplaceProducerFetchResponse()).toEqual({
      fetched: 0,
      total: 0,
      message:
        'No producers found in Base.com. Verify producer/manufacturer records exist in the selected inventory.',
    });
    expect(buildMarketplaceProducerFetchResponse(2, 3)).toEqual({
      fetched: 2,
      total: 3,
      message: 'Successfully synced 2 producers from Base.com',
    });
  });
});
