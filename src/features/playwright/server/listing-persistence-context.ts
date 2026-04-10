import 'server-only';

import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import type { ProductListingRepository } from '@/shared/contracts/integrations/repositories';
import type { ProductListing } from '@/shared/contracts/integrations/listings';
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

export const resolvePlaywrightListingPersistenceContext = async ({
  listingId,
}: {
  listingId: string;
}): Promise<PlaywrightListingPersistenceContext> => {
  const resolved = await findProductListingByIdAcrossProviders(listingId);
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
  missingErrorMessage,
  allowMissingOnSuccess = true,
}: {
  listingId: string;
  result: Pick<PlaywrightServiceListingExecutionBase, 'ok' | 'error'>;
  missingErrorMessage?: string;
  allowMissingOnSuccess?: boolean;
}): Promise<PlaywrightResolvedListingPersistenceContext | null> => {
  const persistenceContext = await resolvePlaywrightListingPersistenceContext({
    listingId,
  });
  if (persistenceContext.found) {
    return persistenceContext;
  }

  if (!result.ok || !allowMissingOnSuccess) {
    throw new Error(result.error ?? missingErrorMessage ?? `Listing not found after job execution: ${listingId}`);
  }

  return null;
};
