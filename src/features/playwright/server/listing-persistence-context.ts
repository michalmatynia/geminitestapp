import 'server-only';

import type { ProductListingRepository } from '@/shared/contracts/integration-listing-storage';
import type { ProductListing } from '@/shared/contracts/playwright-listing-runtime';
import type { PlaywrightServiceListingExecutionBase } from './service-result';

export type PlaywrightResolvedListingPersistenceContext = {
  found: true;
  listing: ProductListing;
  repository: ProductListingRepository;
};

export type PlaywrightMissingListingPersistenceContext = {
  found: false;
  listingId: string;
};

export type PlaywrightListingPersistenceContext =
  | PlaywrightResolvedListingPersistenceContext
  | PlaywrightMissingListingPersistenceContext;

export type PlaywrightListingPersistenceDependencies = {
  findListingById: (
    listingId: string
  ) => Promise<{ listing: ProductListing; repository: ProductListingRepository } | null>;
};

export const resolvePlaywrightListingPersistenceContext = async ({
  listingId,
  dependencies,
}: {
  listingId: string;
  dependencies: PlaywrightListingPersistenceDependencies;
}): Promise<PlaywrightListingPersistenceContext> => {
  const resolved = await dependencies.findListingById(listingId);
  if (!resolved) {
    return {
      found: false,
      listingId,
    };
  }

  return {
    found: true,
    listing: resolved.listing,
    repository: resolved.repository,
  };
};

export const resolvePlaywrightListingPersistenceContextAfterRun = async ({
  listingId,
  result,
  dependencies,
  missingErrorMessage,
  allowMissingOnSuccess = true,
}: {
  listingId: string;
  result: Pick<PlaywrightServiceListingExecutionBase, 'ok' | 'error'>;
  dependencies: PlaywrightListingPersistenceDependencies;
  missingErrorMessage?: string;
  allowMissingOnSuccess?: boolean;
}): Promise<PlaywrightResolvedListingPersistenceContext | null> => {
  const persistenceContext = await resolvePlaywrightListingPersistenceContext({
    listingId,
    dependencies,
  });
  if (persistenceContext.found) {
    return persistenceContext;
  }

  if (!result.ok || !allowMissingOnSuccess) {
    throw new Error(result.error ?? missingErrorMessage ?? `Listing not found after job execution: ${listingId}`);
  }

  return null;
};
