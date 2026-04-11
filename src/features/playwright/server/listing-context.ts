import 'server-only';

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

export type PlaywrightListingRunContextDependencies = {
  findListingById: (
    listingId: string
  ) => Promise<{ listing: ProductListing; repository: ProductListingRepository } | null>;
  getConnectionById: (connectionId: string) => Promise<IntegrationConnectionRecord | null>;
  getIntegrationById: (integrationId: string) => Promise<IntegrationRecord | null>;
};

export function resolvePlaywrightListingRunContext(input: {
  listingId: string;
  includeIntegration: true;
  dependencies: PlaywrightListingRunContextDependencies;
}): Promise<PlaywrightResolvedListingRunContextWithIntegration | PlaywrightMissingListingRunContext>;
export function resolvePlaywrightListingRunContext(input: {
  listingId: string;
  includeIntegration?: false;
  dependencies: PlaywrightListingRunContextDependencies;
}): Promise<PlaywrightResolvedListingRunContext | PlaywrightMissingListingRunContext>;
export async function resolvePlaywrightListingRunContext({
  listingId,
  includeIntegration = false,
  dependencies,
}: {
  listingId: string;
  includeIntegration?: boolean;
  dependencies: PlaywrightListingRunContextDependencies;
}): Promise<PlaywrightListingRunContextResult> {
  const resolvedListing = await dependencies.findListingById(listingId);
  if (!resolvedListing) {
    return {
      ok: false,
      reason: 'listing_not_found',
      listingId,
    };
  }

  const { listing, repository } = resolvedListing;
  const connection = await dependencies.getConnectionById(listing.connectionId);
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

  const integration = await dependencies.getIntegrationById(connection.integrationId);
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
