import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findProductListingByIdAcrossProvidersMock: vi.fn(),
  getExportDefaultConnectionIdMock: vi.fn(),
  getExportDefaultInventoryIdMock: vi.fn(),
  listIntegrationsMock: vi.fn(),
  listConnectionsMock: vi.fn(),
  createListingMock: vi.fn(),
  listProductListingsByProductIdAcrossProvidersMock: vi.fn(),
  listingExistsAcrossProvidersMock: vi.fn(),
  getProductByIdMock: vi.fn(),
  updateProductMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) =>
    mocks.findProductListingByIdAcrossProvidersMock(...args),
  getExportDefaultConnectionId: (...args: unknown[]) =>
    mocks.getExportDefaultConnectionIdMock(...args),
  getExportDefaultInventoryId: (...args: unknown[]) =>
    mocks.getExportDefaultInventoryIdMock(...args),
  getIntegrationRepository: () => ({
    listIntegrations: (...args: unknown[]) => mocks.listIntegrationsMock(...args),
    listConnections: (...args: unknown[]) => mocks.listConnectionsMock(...args),
  }),
  getProductListingRepository: () => ({
    createListing: (...args: unknown[]) => mocks.createListingMock(...args),
  }),
  listProductListingsByProductIdAcrossProviders: (...args: unknown[]) =>
    mocks.listProductListingsByProductIdAcrossProvidersMock(...args),
  listingExistsAcrossProviders: (...args: unknown[]) =>
    mocks.listingExistsAcrossProvidersMock(...args),
}));

vi.mock('@/features/products/server', () => ({
  getProductRepository: () => ({
    getProductById: (...args: unknown[]) => mocks.getProductByIdMock(...args),
    updateProduct: (...args: unknown[]) => mocks.updateProductMock(...args),
  }),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => mocks.captureExceptionMock(...args),
  },
}));

import {
  applyCanonicalBaseBadgeFallback,
  listCanonicalBaseProductListings,
} from './base-listing-canonicalization';

const createBaseListing = (overrides: Record<string, unknown> = {}) => ({
  id: 'listing-1',
  productId: 'product-1',
  integrationId: 'integration-base',
  connectionId: 'connection-1',
  externalListingId: 'base-123',
  inventoryId: 'inv-main',
  status: 'active',
  listedAt: null,
  expiresAt: null,
  nextRelistAt: null,
  relistPolicy: null,
  relistAttempts: 0,
  lastRelistedAt: null,
  lastStatusCheckAt: null,
  marketplaceData: {
    source: 'base-export',
    marketplace: 'base',
  },
  failureReason: null,
  exportHistory: [],
  integration: {
    id: 'integration-base',
    name: 'Base.com',
    slug: 'baselinker',
  },
  connection: {
    id: 'connection-1',
    name: 'Primary Base connection',
  },
  ...overrides,
});

describe('base listing canonicalization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);
    mocks.getExportDefaultConnectionIdMock.mockResolvedValue('connection-1');
    mocks.getExportDefaultInventoryIdMock.mockResolvedValue('inv-main');
    mocks.listIntegrationsMock.mockResolvedValue([
      {
        id: 'integration-base',
        slug: 'baselinker',
      },
    ]);
    mocks.listConnectionsMock.mockResolvedValue([
      {
        id: 'connection-1',
        baseApiToken: 'token-1',
      },
    ]);
    mocks.createListingMock.mockResolvedValue({ id: 'listing-created' });
    mocks.listingExistsAcrossProvidersMock.mockResolvedValue(false);
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      baseProductId: 'base-123',
    });
    mocks.updateProductMock.mockResolvedValue({
      id: 'product-1',
      baseProductId: 'base-123',
    });
    mocks.captureExceptionMock.mockResolvedValue(undefined);
  });

  it('backfills a missing Base listing row from product.baseProductId', async () => {
    const backfilledListing = createBaseListing();
    mocks.listProductListingsByProductIdAcrossProvidersMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([backfilledListing]);

    const listings = await listCanonicalBaseProductListings('product-1');

    expect(mocks.createListingMock).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'connection-1',
      status: 'active',
      externalListingId: 'base-123',
      inventoryId: 'inv-main',
      marketplaceData: {
        source: 'base-import-backfill',
        marketplace: 'base',
      },
    });
    expect(listings).toEqual([backfilledListing]);
  });

  it('syncs product.baseProductId from a unique existing Base listing id', async () => {
    const listing = createBaseListing();
    mocks.getProductByIdMock.mockResolvedValue({
      id: 'product-1',
      baseProductId: null,
    });
    mocks.listProductListingsByProductIdAcrossProvidersMock.mockResolvedValue([listing]);

    const listings = await listCanonicalBaseProductListings('product-1');

    expect(mocks.updateProductMock).toHaveBeenCalledWith('product-1', {
      baseProductId: 'base-123',
    });
    expect(mocks.createListingMock).not.toHaveBeenCalled();
    expect(listings).toEqual([listing]);
  });

  it('adds an active Base badge fallback for products linked by baseProductId', async () => {
    mocks.getProductByIdMock.mockImplementation(async (productId: string) => {
      if (productId === 'product-1') {
        return { id: 'product-1', baseProductId: 'base-123' };
      }
      return { id: productId, baseProductId: null };
    });

    const payload = await applyCanonicalBaseBadgeFallback({}, ['product-1', 'product-2']);

    expect(payload).toEqual({
      'product-1': {
        base: 'active',
      },
    });
  });
});
