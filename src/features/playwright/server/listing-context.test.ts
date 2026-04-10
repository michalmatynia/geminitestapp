import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findProductListingByIdAcrossProvidersMock,
  getConnectionByIdMock,
  getIntegrationByIdMock,
} = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  getIntegrationByIdMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    findProductListingByIdAcrossProvidersMock(...args),
  getIntegrationRepository: async () => ({
    getConnectionById: (...args: unknown[]) => getConnectionByIdMock(...args),
    getIntegrationById: (...args: unknown[]) => getIntegrationByIdMock(...args),
  }),
}));

import { resolvePlaywrightListingRunContext } from './listing-context';

describe('playwright listing context helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the missing listing reason when the listing cannot be found', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingRunContext({
        listingId: 'listing-1',
      })
    ).resolves.toEqual({
      ok: false,
      reason: 'listing_not_found',
      listingId: 'listing-1',
    });
  });

  it('returns listing and connection when integration is not required', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        connectionId: 'connection-1',
      },
      repository: {
        updateListingStatus: vi.fn(),
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
    });

    const result = await resolvePlaywrightListingRunContext({
      listingId: 'listing-1',
    });

    expect(result).toMatchObject({
      ok: true,
      listing: {
        id: 'listing-1',
        connectionId: 'connection-1',
      },
      connection: {
        id: 'connection-1',
        integrationId: 'integration-1',
      },
    });
    expect(getIntegrationByIdMock).not.toHaveBeenCalled();
  });

  it('returns the missing integration reason when integration lookup is required', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        connectionId: 'connection-1',
      },
      repository: {
        updateListingStatus: vi.fn(),
      },
    });
    getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      integrationId: 'integration-1',
    });
    getIntegrationByIdMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingRunContext({
        listingId: 'listing-1',
        includeIntegration: true,
      })
    ).resolves.toMatchObject({
      ok: false,
      reason: 'integration_not_found',
      integrationId: 'integration-1',
      connection: {
        id: 'connection-1',
        integrationId: 'integration-1',
      },
    });
  });
});
