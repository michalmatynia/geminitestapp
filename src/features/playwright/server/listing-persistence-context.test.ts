import { beforeEach, describe, expect, it, vi } from 'vitest';

const findProductListingByIdAcrossProvidersMock = vi.fn();

import {
  resolvePlaywrightListingPersistenceContext,
  resolvePlaywrightListingPersistenceContextAfterRun,
} from './listing-persistence-context';

const createDependencies = () => ({
  findListingById: findProductListingByIdAcrossProvidersMock,
});

describe('playwright listing persistence context helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a missing result when the listing cannot be resolved', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingPersistenceContext({
        listingId: 'listing-1',
        dependencies: createDependencies(),
      })
    ).resolves.toEqual({
      found: false,
      listingId: 'listing-1',
    });
  });

  it('returns the persisted listing and repository when the listing exists', async () => {
    const repository = {
      updateListingStatus: vi.fn(),
      updateListing: vi.fn(),
      appendExportHistory: vi.fn(),
    };
    findProductListingByIdAcrossProvidersMock.mockResolvedValue({
      listing: {
        id: 'listing-1',
      },
      repository,
    });

    await expect(
      resolvePlaywrightListingPersistenceContext({
        listingId: 'listing-1',
        dependencies: createDependencies(),
      })
    ).resolves.toEqual({
      found: true,
      listing: {
        id: 'listing-1',
      },
      repository,
    });
  });

  it('returns null after a successful run when the listing no longer exists and missing success is allowed', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingPersistenceContextAfterRun({
        listingId: 'listing-1',
        result: {
          ok: true,
          error: null,
        },
        dependencies: createDependencies(),
      })
    ).resolves.toBeNull();
  });

  it('throws the run error when the listing no longer exists after a failed run', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingPersistenceContextAfterRun({
        listingId: 'listing-1',
        result: {
          ok: false,
          error: 'Listing execution failed.',
        },
        dependencies: createDependencies(),
      })
    ).rejects.toThrow('Listing execution failed.');
  });

  it('throws the fallback missing error when success is not allowed to lose persistence context', async () => {
    findProductListingByIdAcrossProvidersMock.mockResolvedValue(null);

    await expect(
      resolvePlaywrightListingPersistenceContextAfterRun({
        listingId: 'listing-1',
        result: {
          ok: true,
          error: null,
        },
        dependencies: createDependencies(),
        allowMissingOnSuccess: false,
        missingErrorMessage: 'Listing not found after job execution: listing-1',
      })
    ).rejects.toThrow('Listing not found after job execution: listing-1');
  });
});
