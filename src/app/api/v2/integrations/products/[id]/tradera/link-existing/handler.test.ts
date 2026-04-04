import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  getIntegrationRepositoryMock: vi.fn(),
  getProductListingRepositoryMock: vi.fn(),
  getTraderaDefaultConnectionIdMock: vi.fn(),
  findProductListingByProductAndConnectionAcrossProvidersMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  createListingMock: vi.fn(),
  getListingsByConnectionMock: vi.fn(),
  updateListingExternalIdMock: vi.fn(),
  updateListingStatusMock: vi.fn(),
  updateListingMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  getIntegrationRepository: (...args: unknown[]) => mocks.getIntegrationRepositoryMock(...args),
  getProductListingRepository: (...args: unknown[]) =>
    mocks.getProductListingRepositoryMock(...args),
  getTraderaDefaultConnectionId: (...args: unknown[]) =>
    mocks.getTraderaDefaultConnectionIdMock(...args),
  findProductListingByProductAndConnectionAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

import { POST_handler } from './handler';

const createRequest = (): Request =>
  new Request('http://localhost/api/v2/integrations/products/product-1/tradera/link-existing', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
  });

describe('integration product Tradera link-existing handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mocks.fetchMock);

    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        listingUrl: 'https://www.tradera.com/item/725128879',
      },
    });

    mocks.listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-tradera',
        name: 'Tradera',
        slug: 'tradera',
      },
    ]);
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'connection-1',
        name: 'Main Browser',
        integrationId: 'integration-tradera',
        username: 'seller-one',
      },
      {
        id: 'connection-2',
        name: 'Backup Browser',
        integrationId: 'integration-tradera',
        username: 'seller-two',
      },
    ]);
    mocks.getIntegrationRepositoryMock.mockResolvedValue({
      listIntegrations: mocks.listIntegrationsMock,
      listConnections: mocks.listConnectionsMock,
    });

    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      name_en: 'Keychain',
    });
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: mocks.getProductByIdMock,
    });

    mocks.getTraderaDefaultConnectionIdMock.mockResolvedValue('connection-1');

    mocks.createListingMock.mockResolvedValue({
      id: 'listing-created',
      productId: 'product-1',
      integrationId: 'integration-tradera',
      connectionId: 'connection-1',
      externalListingId: '725128879',
      status: 'active',
    });
    mocks.getListingsByConnectionMock.mockResolvedValue([]);
    mocks.getProductListingRepositoryMock.mockResolvedValue({
      createListing: mocks.createListingMock,
      getListingsByConnection: mocks.getListingsByConnectionMock,
    });

    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue(null);

    mocks.fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue(
        '<script type="application/ld+json">{"seller":{"alternateName":"seller-one"}}</script>'
      ),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates a linked Tradera listing by inferring the connection from the seller alias', async () => {
    const response = await POST_handler(createRequest() as never, {} as never, {
      id: 'product-1',
    });
    const payload = await response.json();

    expect(mocks.fetchMock).toHaveBeenCalledWith('https://www.tradera.com/item/725128879', {
      headers: expect.objectContaining({
        accept: expect.stringContaining('text/html'),
        'user-agent': expect.stringContaining('Mozilla/5.0'),
      }),
      cache: 'no-store',
    });
    expect(mocks.createListingMock).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'product-1',
        integrationId: 'integration-tradera',
        connectionId: 'connection-1',
        status: 'active',
        externalListingId: '725128879',
        marketplaceData: expect.objectContaining({
          source: 'manual-link-by-url',
          marketplace: 'tradera',
          listingUrl: 'https://www.tradera.com/item/725128879',
          tradera: expect.objectContaining({
            manualLink: expect.objectContaining({
              externalListingId: '725128879',
              listingUrl: 'https://www.tradera.com/item/725128879',
              inferenceMethod: 'seller_alias',
              sellerAlias: 'seller-one',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      linked: true,
      listingId: 'listing-created',
      connectionId: 'connection-1',
      integrationId: 'integration-tradera',
      externalListingId: '725128879',
      listingUrl: 'https://www.tradera.com/item/725128879',
      inferenceMethod: 'seller_alias',
    });
  });

  it('updates the existing listing when the product already has a linked Tradera connection', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        listingUrl: 'https://www.tradera.com/item/725128879',
        connectionId: 'connection-2',
      },
    });
    mocks.findProductListingByProductAndConnectionAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-existing',
      },
      repository: {
        updateListingExternalId: mocks.updateListingExternalIdMock,
        updateListingStatus: mocks.updateListingStatusMock,
        updateListing: mocks.updateListingMock,
      },
    });

    const response = await POST_handler(createRequest() as never, {} as never, {
      id: 'product-1',
    });
    const payload = await response.json();

    expect(mocks.createListingMock).not.toHaveBeenCalled();
    expect(mocks.updateListingExternalIdMock).toHaveBeenCalledWith(
      'listing-existing',
      '725128879'
    );
    expect(mocks.updateListingStatusMock).toHaveBeenCalledWith('listing-existing', 'active');
    expect(mocks.updateListingMock).toHaveBeenCalledWith(
      'listing-existing',
      expect.objectContaining({
        failureReason: null,
        marketplaceData: expect.objectContaining({
          tradera: expect.objectContaining({
            manualLink: expect.objectContaining({
              inferenceMethod: 'provided',
            }),
          }),
        }),
      })
    );
    expect(payload).toMatchObject({
      linked: true,
      listingId: 'listing-existing',
      connectionId: 'connection-2',
      inferenceMethod: 'provided',
    });
  });

  it('rejects an invalid explicit Tradera connection id', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        listingUrl: 'https://www.tradera.com/item/725128879',
        connectionId: 'connection-missing',
      },
    });

    await expect(
      POST_handler(createRequest() as never, {} as never, { id: 'product-1' })
    ).rejects.toMatchObject({
      httpStatus: 400,
      meta: expect.objectContaining({
        reason: 'invalid_connection_id',
        connectionId: 'connection-missing',
      }),
    });

    expect(mocks.fetchMock).not.toHaveBeenCalled();
  });

  it('returns an ambiguous-connection conflict when the link cannot be matched safely', async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<html><body>No seller metadata</body></html>'),
    });

    await expect(
      POST_handler(createRequest() as never, {} as never, { id: 'product-1' })
    ).rejects.toMatchObject({
      httpStatus: 409,
      meta: expect.objectContaining({
        reason: 'ambiguous_connection',
        candidateConnections: expect.arrayContaining([
          expect.objectContaining({
            connectionId: 'connection-1',
            connectionUsername: 'seller-one',
          }),
          expect.objectContaining({
            connectionId: 'connection-2',
            connectionUsername: 'seller-two',
          }),
        ]),
      }),
    });
  });

  it('blocks linking a Tradera listing that is already connected to another product', async () => {
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        listingUrl: 'https://www.tradera.com/item/725128879',
        connectionId: 'connection-1',
      },
    });
    mocks.getListingsByConnectionMock.mockResolvedValue([
      {
        id: 'listing-other-product',
        productId: 'product-other',
        connectionId: 'connection-1',
        externalListingId: '725128879',
        status: 'active',
      },
    ]);

    await expect(
      POST_handler(createRequest() as never, {} as never, { id: 'product-1' })
    ).rejects.toMatchObject({
      httpStatus: 409,
      meta: expect.objectContaining({
        reason: 'listing_already_linked',
        connectionId: 'connection-1',
        existingListingId: 'listing-other-product',
        existingProductId: 'product-other',
        externalListingId: '725128879',
      }),
    });

    expect(mocks.createListingMock).not.toHaveBeenCalled();
  });
});
