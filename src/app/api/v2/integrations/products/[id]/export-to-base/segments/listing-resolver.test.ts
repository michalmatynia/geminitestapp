import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductListing, ProductListingRepository } from '@/shared/contracts/integrations';

const mocks = vi.hoisted(() => ({
  findByIdMock: vi.fn(),
  findByProductAndConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  findProductListingByIdAcrossProviders: (...args: unknown[]) => mocks.findByIdMock(...args),
  findProductListingByProductAndConnectionAcrossProviders: (...args: unknown[]) =>
    mocks.findByProductAndConnectionMock(...args),
}));

import { resolveListingForExport } from './listing-resolver';

const createRepositoryMock = (): ProductListingRepository => ({
  getListingsByProductId: vi.fn(),
  getListingById: vi.fn(),
  createListing: vi.fn(),
  updateListingExternalId: vi.fn().mockResolvedValue(undefined),
  updateListingStatus: vi.fn().mockResolvedValue(undefined),
  updateListing: vi.fn().mockResolvedValue(undefined),
  updateListingInventoryId: vi.fn().mockResolvedValue(undefined),
  appendExportHistory: vi.fn().mockResolvedValue(undefined),
  deleteListing: vi.fn().mockResolvedValue(undefined),
  listingExists: vi.fn(),
  getListingsByProductIds: vi.fn(),
  getListingsByConnection: vi.fn(),
  listAllListings: vi.fn(),
});

const createListing = (overrides?: Partial<ProductListing>): ProductListing => ({
  id: 'listing-1',
  productId: 'product-1',
  integrationId: 'integration-base',
  connectionId: 'connection-1',
  externalListingId: 'base-123',
  inventoryId: 'inv-old',
  status: 'active',
  listedAt: null,
  expiresAt: null,
  nextRelistAt: null,
  relistPolicy: null,
  relistAttempts: 0,
  lastRelistedAt: null,
  lastStatusCheckAt: null,
  marketplaceData: null,
  failureReason: null,
  exportHistory: [],
  createdAt: '2026-03-01T00:00:00.000Z',
  updatedAt: '2026-03-01T00:00:00.000Z',
  ...overrides,
});

describe('resolveListingForExport', () => {
  beforeEach(() => {
    mocks.findByIdMock.mockReset();
    mocks.findByProductAndConnectionMock.mockReset();
  });

  it('reuses the resolved listing repository for full exports when a listing already exists', async () => {
    const resolvedRepo = createRepositoryMock();
    const primaryRepo = createRepositoryMock();
    const existingListing = createListing();

    mocks.findByProductAndConnectionMock.mockResolvedValue({
      listing: existingListing,
      repository: resolvedRepo,
    });

    const result = await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: false,
      externalListingId: null,
      listingIdFromData: null,
      baseIntegrationId: 'integration-base',
      primaryListingRepo: primaryRepo,
    });

    expect(result.listingRepo).toBe(resolvedRepo);
    expect(result.listingId).toBe('listing-1');
    expect(result.listingExternalId).toBe('base-123');
    expect(result.listingInventoryId).toBeNull();
    expect(resolvedRepo.updateListingStatus).toHaveBeenCalledWith('listing-1', 'pending');
    expect(resolvedRepo.updateListingInventoryId).toHaveBeenCalledWith('listing-1', 'inv-main');
    expect(primaryRepo.createListing).not.toHaveBeenCalled();
  });

  it('creates a new listing through the primary repository when no listing exists', async () => {
    const primaryRepo = createRepositoryMock();
    const createdListing = createListing({
      id: 'listing-created',
      externalListingId: null,
      inventoryId: 'inv-main',
    });

    mocks.findByProductAndConnectionMock.mockResolvedValue(null);
    vi.mocked(primaryRepo.createListing).mockResolvedValue(createdListing as never);

    const result = await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: false,
      externalListingId: null,
      listingIdFromData: null,
      baseIntegrationId: 'integration-base',
      primaryListingRepo: primaryRepo,
    });

    expect(result.listingRepo).toBe(primaryRepo);
    expect(result.listingId).toBe('listing-created');
    expect(result.listingExternalId).toBeNull();
    expect(result.listingInventoryId).toBeNull();
    expect(primaryRepo.createListing).toHaveBeenCalledWith({
      productId: 'product-1',
      integrationId: 'integration-base',
      connectionId: 'connection-1',
      externalListingId: null,
      inventoryId: 'inv-main',
      marketplaceData: {
        source: 'base-export',
        marketplace: 'base',
      },
    });
  });
});
