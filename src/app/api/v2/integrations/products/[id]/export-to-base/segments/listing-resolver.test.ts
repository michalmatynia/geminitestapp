import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductListing } from '@/shared/contracts/integrations/listings';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';

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

  it('runs both lookup queries in parallel for images-only exports', async () => {
    const resolvedRepo = createRepositoryMock();
    const primaryRepo = createRepositoryMock();
    const existingListing = createListing({ inventoryId: 'inv-old' });

    // Track call order to verify parallelism
    const callOrder: string[] = [];

    mocks.findByIdMock.mockImplementation(async () => {
      callOrder.push('findById:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('findById:end');
      return { listing: existingListing, repository: resolvedRepo };
    });

    mocks.findByProductAndConnectionMock.mockImplementation(async () => {
      callOrder.push('findByConnection:start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      callOrder.push('findByConnection:end');
      return { listing: existingListing, repository: resolvedRepo };
    });

    await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: true,
      externalListingId: 'base-123',
      listingIdFromData: 'listing-1',
      baseIntegrationId: 'integration-base',
      primaryListingRepo: primaryRepo,
    });

    // Both should start before either finishes (parallel execution)
    expect(callOrder[0]).toBe('findById:start');
    expect(callOrder[1]).toBe('findByConnection:start');
    expect(mocks.findByIdMock).toHaveBeenCalledTimes(1);
    expect(mocks.findByProductAndConnectionMock).toHaveBeenCalledTimes(1);
  });

  it('prefers ID-based listing over connection-based for images-only', async () => {
    const idRepo = createRepositoryMock();
    const connectionRepo = createRepositoryMock();
    const idListing = createListing({ id: 'id-listing', externalListingId: 'from-id' });
    const connectionListing = createListing({ id: 'conn-listing', externalListingId: 'from-conn' });

    mocks.findByIdMock.mockResolvedValue({
      listing: idListing,
      repository: idRepo,
    });
    mocks.findByProductAndConnectionMock.mockResolvedValue({
      listing: connectionListing,
      repository: connectionRepo,
    });

    const result = await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: true,
      externalListingId: null,
      listingIdFromData: 'id-listing',
      baseIntegrationId: 'integration-base',
      primaryListingRepo: createRepositoryMock(),
    });

    expect(result.listingRepo).toBe(idRepo);
    expect(result.listingId).toBe('id-listing');
    expect(result.listingExternalId).toBe('from-id');
  });

  it('falls back to connection-based listing when ID-based returns no match', async () => {
    const connectionRepo = createRepositoryMock();
    const connectionListing = createListing({ id: 'conn-listing', externalListingId: 'from-conn' });

    mocks.findByIdMock.mockResolvedValue(null);
    mocks.findByProductAndConnectionMock.mockResolvedValue({
      listing: connectionListing,
      repository: connectionRepo,
    });

    const result = await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: true,
      externalListingId: null,
      listingIdFromData: 'stale-id',
      baseIntegrationId: 'integration-base',
      primaryListingRepo: createRepositoryMock(),
    });

    expect(result.listingRepo).toBe(connectionRepo);
    expect(result.listingId).toBe('conn-listing');
    expect(result.listingExternalId).toBe('from-conn');
  });

  it('skips ID lookup when listingIdFromData is null for images-only', async () => {
    const connectionRepo = createRepositoryMock();
    const connectionListing = createListing({ externalListingId: 'ext-1' });

    mocks.findByProductAndConnectionMock.mockResolvedValue({
      listing: connectionListing,
      repository: connectionRepo,
    });

    const result = await resolveListingForExport({
      productId: 'product-1',
      connectionId: 'connection-1',
      inventoryId: 'inv-main',
      imagesOnly: true,
      externalListingId: null,
      listingIdFromData: null,
      baseIntegrationId: 'integration-base',
      primaryListingRepo: createRepositoryMock(),
    });

    expect(mocks.findByIdMock).not.toHaveBeenCalled();
    expect(result.listingExternalId).toBe('ext-1');
  });
});
