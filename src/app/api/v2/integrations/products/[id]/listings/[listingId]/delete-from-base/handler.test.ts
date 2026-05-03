import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  listProductListingsByProductIdAcrossProvidersMock: vi.fn(),
  getConnectionByIdMock: vi.fn(),
  deleteBaseProductMock: vi.fn(),
  resolveBaseConnectionTokenMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getProductRepositoryMock: vi.fn(),
  createRunMock: vi.fn(),
  updateRunMock: vi.fn(),
  createRunEventMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  readOptionalServerAuthSession: (...args: unknown[]) =>
    mocks.readOptionalServerAuthSessionMock(...args),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByIdAcrossProvidersMock(...args),
  listProductListingsByProductIdAcrossProviders: (...args: unknown[]) =>
    mocks.listProductListingsByProductIdAcrossProvidersMock(...args),
  getIntegrationRepository: () => ({
    getConnectionById: (...args: unknown[]) => mocks.getConnectionByIdMock(...args),
  }),
  deleteBaseProduct: (...args: unknown[]) => mocks.deleteBaseProductMock(...args),
  resolveBaseConnectionToken: (...args: unknown[]) => mocks.resolveBaseConnectionTokenMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  parseJsonBody: (...args: unknown[]) => mocks.parseJsonBodyMock(...args),
  getProductRepository: (...args: unknown[]) => mocks.getProductRepositoryMock(...args),
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: () => ({
    createRun: (...args: unknown[]) => mocks.createRunMock(...args),
    updateRun: (...args: unknown[]) => mocks.updateRunMock(...args),
    createRunEvent: (...args: unknown[]) => mocks.createRunEventMock(...args),
  }),
}));

import { postHandler } from './handler';

describe('integration listing delete-from-base handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.readOptionalServerAuthSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
    mocks.parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: { inventoryId: 'inv-main' },
    });
    mocks.findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        inventoryId: 'inv-main',
        externalListingId: '531482664',
      },
      repository: {
        updateListingStatus: vi.fn().mockResolvedValue(undefined),
        appendExportHistory: vi.fn().mockResolvedValue(undefined),
        updateListingExternalId: vi.fn().mockResolvedValue(undefined),
      },
    });
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        externalListingId: null,
        integration: {
          slug: 'baselinker',
        },
      },
    ]);
    mocks.getConnectionByIdMock.mockResolvedValue({
      id: 'connection-1',
      baseApiToken: 'token-1',
    });
    mocks.resolveBaseConnectionTokenMock.mockReturnValue({ token: 'resolved-token' });
    mocks.deleteBaseProductMock.mockResolvedValue(undefined);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: '531482664',
      }),
      updateProduct: vi.fn().mockResolvedValue({ id: 'product-1', baseProductId: null }),
    });
    mocks.createRunMock.mockResolvedValue({ id: 'run-1' });
    mocks.updateRunMock.mockResolvedValue(undefined);
    mocks.createRunEventMock.mockResolvedValue(undefined);
  });

  it('clears stale Base ids after successful deletion so re-export can create a new product', async () => {
    const response = await postHandler(
      new NextRequest('http://localhost/api/v2/integrations/products/product-1/listings/listing-1/delete-from-base', {
        method: 'POST',
      }),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const payload = (await response.json()) as {
      status: string;
      message: string;
      runId: string | null;
    };
    const resolved = await mocks.findProductListingByIdAcrossProvidersMock.mock.results[0]?.value;
    const listingRepository = resolved.repository as {
      updateListingStatus: ReturnType<typeof vi.fn>;
      appendExportHistory: ReturnType<typeof vi.fn>;
      updateListingExternalId: ReturnType<typeof vi.fn>;
    };
    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;

    expect(mocks.deleteBaseProductMock).toHaveBeenCalledWith(
      'resolved-token',
      'inv-main',
      '531482664'
    );
    expect(listingRepository.updateListingExternalId).toHaveBeenCalledWith('listing-1', null);
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: null,
    });
    expect(payload).toEqual({
      status: 'deleted',
      message: 'Delete from Base.com finished.',
      runId: 'run-1',
    });
  });

  it('clears a stale product.baseProductId when no canonical Base listing remains after deletion', async () => {
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: 'other-base-id',
      }),
      updateProduct: vi.fn().mockResolvedValue({ id: 'product-1', baseProductId: null }),
    });

    await postHandler(
      new NextRequest('http://localhost/api/v2/integrations/products/product-1/listings/listing-1/delete-from-base', {
        method: 'POST',
      }),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: null,
    });
  });

  it('repoints product.baseProductId to the one remaining Base listing after deletion', async () => {
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([
      {
        id: 'listing-1',
        productId: 'product-1',
        connectionId: 'connection-1',
        externalListingId: null,
        integration: {
          slug: 'baselinker',
        },
      },
      {
        id: 'listing-2',
        productId: 'product-1',
        connectionId: 'connection-2',
        externalListingId: 'base-remaining-2',
        integration: {
          slug: 'base',
        },
      },
    ]);
    mocks.getProductRepositoryMock.mockResolvedValue({
      getProductById: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: '531482664',
      }),
      updateProduct: vi.fn().mockResolvedValue({
        id: 'product-1',
        baseProductId: 'base-remaining-2',
      }),
    });

    await postHandler(
      new NextRequest('http://localhost/api/v2/integrations/products/product-1/listings/listing-1/delete-from-base', {
        method: 'POST',
      }),
      {} as never,
      { id: 'product-1', listingId: 'listing-1' }
    );

    const productRepository = await mocks.getProductRepositoryMock.mock.results[0]?.value;
    expect(productRepository.updateProduct).toHaveBeenCalledWith('product-1', {
      baseProductId: 'base-remaining-2',
    });
  });
});
