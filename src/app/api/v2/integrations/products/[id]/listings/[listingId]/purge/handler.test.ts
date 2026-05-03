import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  listProductListingsByProductIdAcrossProvidersMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByIdAcrossProvidersMock(...args),
  listProductListingsByProductIdAcrossProviders: (...args: unknown[]) =>
    mocks.listProductListingsByProductIdAcrossProvidersMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

import { deleteHandler } from './handler';

describe('integration listing purge handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
      },
      repository: {
        deleteListing: vi.fn().mockResolvedValue(undefined),
      },
    });
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([]);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: 'base-123',
      }),
      updateProduct: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: null,
      }),
    });
  });

  it('clears the saved Base link when purging the last Base listing', async () => {
    const response = await deleteHandler(
      new NextRequest(
        'http://localhost/api/v2/integrations/products/product-1/listings/listing-1/purge',
        {
          method: 'DELETE',
        }
      ),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const resolved = await mocks.findProductListingByIdAcrossProvidersMock.mock.results[0]?.value;
    const listingRepository = resolved.repository as {
      deleteListing: ReturnType<typeof vi.fn>;
    };
    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;

    expect(listingRepository.deleteListing).toHaveBeenCalledWith('listing-1');
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: null,
    });
    expect(response.status).toBe(204);
  });

  it('repoints the saved Base link to the only remaining Base listing after purge', async () => {
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-2',
        externalListingId: 'base-remaining-2',
        integration: {
          slug: 'base-com',
        },
      },
    ]);

    await deleteHandler(
      new NextRequest(
        'http://localhost/api/v2/integrations/products/product-1/listings/listing-1/purge',
        {
          method: 'DELETE',
        }
      ),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: 'base-remaining-2',
    });
  });

  it('leaves product.baseProductId unchanged when the canonical Base link does not change', async () => {
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-2',
        externalListingId: 'base-123',
        integration: {
          slug: 'baselinker',
        },
      },
    ]);

    await deleteHandler(
      new NextRequest(
        'http://localhost/api/v2/integrations/products/product-1/listings/listing-1/purge',
        {
          method: 'DELETE',
        }
      ),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;
    expect(productRepository.updateProduct).not.toHaveBeenCalled();
  });
});
