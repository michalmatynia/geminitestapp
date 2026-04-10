import 'server-only';

import {
  findProductListingByIdAcrossProviders,
  getIntegrationRepository,
} from '@/features/integrations/server';
import type {
  IntegrationConnectionRecord,
  IntegrationRecord,
  ProductListingRepository,
} from '@/shared/contracts/integrations/repositories';
import type { ProductListing } from '@/shared/contracts/integrations/listings';

export type PlaywrightResolvedListingRunContext = {
  ok: true;
  listing: ProductListing;
  repository: ProductListingRepository;
  connection: IntegrationConnectionRecord;
  integration?: IntegrationRecord;
};

export type PlaywrightResolvedListingRunContextWithIntegration =
  PlaywrightResolvedListingRunContext & {
    integration: IntegrationRecord;
  };

export type PlaywrightMissingListingRunContext =
  | {
      ok: false;
      reason: 'listing_not_found';
      listingId: string;
    }
  | {
      ok: false;
      reason: 'connection_not_found';
      listing: ProductListing;
      repository: ProductListingRepository;
      connectionId: string;
    }
  | {
      ok: false;
      reason: 'integration_not_found';
      listing: ProductListing;
      repository: ProductListingRepository;
      connection: IntegrationConnectionRecord;
      integrationId: string;
    };

export type PlaywrightListingRunContextResult =
  | PlaywrightResolvedListingRunContext
  | PlaywrightMissingListingRunContext;

export function resolvePlaywrightListingRunContext(input: {
  listingId: string;
  includeIntegration: true;
}): Promise<PlaywrightResolvedListingRunContextWithIntegration | PlaywrightMissingListingRunContext>;
export function resolvePlaywrightListingRunContext(input: {
  listingId: string;
  includeIntegration?: false;
}): Promise<PlaywrightResolvedListingRunContext | PlaywrightMissingListingRunContext>;
export async function resolvePlaywrightListingRunContext({
  listingId,
  includeIntegration = false,
}: {
  listingId: string;
  includeIntegration?: boolean;
}): Promise<PlaywrightListingRunContextResult> {
  const resolvedListing = await findProductListingByIdAcrossProviders(listingId);
  if (!resolvedListing) {
    return {
      ok: false,
      reason: 'listing_not_found',
      listingId,
    };
  }

  const { listing, repository } = resolvedListing;
  const integrationRepo = await getIntegrationRepository();
  const connection = await integrationRepo.getConnectionById(listing.connectionId);
  if (!connection) {
    return {
      ok: false,
      reason: 'connection_not_found',
      listing,
      repository,
      connectionId: listing.connectionId,
    };
  }

  if (!includeIntegration) {
    return {
      ok: true,
      listing,
      repository,
      connection,
    };
  }

  const integration = await integrationRepo.getIntegrationById(connection.integrationId);
  if (!integration) {
    return {
      ok: false,
      reason: 'integration_not_found',
      listing,
      repository,
      connection,
      integrationId: connection.integrationId,
    };
  }

  return {
    ok: true,
    listing,
    repository,
    connection,
    integration,
  };
}
