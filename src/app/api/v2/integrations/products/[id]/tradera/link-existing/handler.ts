import { NextRequest, NextResponse } from 'next/server';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  findProductListingByProductAndConnectionAcrossProviders,
  getIntegrationRepository,
  getProductListingRepository,
  getTraderaDefaultConnectionId,
} from '@/features/integrations/server';
import {
  extractTraderaSellerAliasFromHtml,
  resolveTraderaManualLinkConnection,
  type TraderaManualLinkConnectionCandidate,
} from '@/features/integrations/services/tradera-listing/manual-link';
import {
  buildCanonicalTraderaListingUrl,
  extractExternalListingId,
} from '@/features/integrations/services/tradera-listing/utils';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getProductRepository } from '@/features/products/server';
import type { IntegrationConnectionRecord, IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import type { TraderaProductLinkExistingResponse } from '@/shared/contracts/integrations/listings';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { traderaProductLinkExistingPayloadSchema } from '@/shared/contracts/integrations/listings';

const requestSchema = traderaProductLinkExistingPayloadSchema;

const MANUAL_LINK_FETCH_HEADERS = {
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'user-agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
} as const;

const normalizeListingStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const isBlockingLinkedStatus = (value: string | null | undefined): boolean => {
  const normalized = normalizeListingStatus(value);
  return normalized.length > 0 && normalized !== 'removed' && normalized !== 'failed';
};

const toCandidate = (
  integration: IntegrationRecord,
  connection: IntegrationConnectionRecord
): TraderaManualLinkConnectionCandidate => ({
  integrationId: integration.id,
  integrationName: integration.name,
  integrationSlug: integration.slug,
  connectionId: connection.id,
  connectionName: connection.name,
  connectionUsername: connection.username?.trim() || null,
  connection,
});

const listTraderaConnectionCandidates = async (): Promise<TraderaManualLinkConnectionCandidate[]> => {
  const integrationRepository = await getIntegrationRepository();
  const integrations = await integrationRepository.listIntegrations();
  const traderaIntegrations = integrations.filter((integration) =>
    isTraderaIntegrationSlug(integration.slug)
  );

  const groupedConnections = await Promise.all(
    traderaIntegrations.map(async (integration) => ({
      integration,
      connections: await integrationRepository.listConnections(integration.id),
    }))
  );

  return groupedConnections.flatMap(({ integration, connections }) =>
    connections.map((connection) => toCandidate(integration, connection))
  );
};

const readListingHtml = async (listingUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(listingUrl, {
      headers: MANUAL_LINK_FETCH_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
};

const buildMarketplaceData = (args: {
  listingUrl: string;
  externalListingId: string;
  inferenceMethod: TraderaProductLinkExistingResponse['inferenceMethod'];
  sellerAlias: string | null;
  linkedAt: string;
}): Record<string, unknown> => ({
  source: 'manual-link-by-url',
  marketplace: 'tradera',
  listingUrl: args.listingUrl,
  tradera: {
    manualLink: {
      linkedAt: args.linkedAt,
      externalListingId: args.externalListingId,
      listingUrl: args.listingUrl,
      inferenceMethod: args.inferenceMethod,
      sellerAlias: args.sellerAlias,
    },
  },
});

/**
 * POST /api/v2/integrations/products/[id]/tradera/link-existing
 * Links a product to an already existing Tradera listing by public URL.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id?.trim() ?? '';
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const parsed = await parseJsonBody(req, requestSchema, {
    logPrefix: 'integrations.products.tradera.link-existing.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const listingUrl = parsed.data.listingUrl.trim();
  const providedConnectionId = parsed.data.connectionId?.trim() || '';
  const externalListingId = extractExternalListingId(listingUrl);
  if (!externalListingId) {
    throw badRequestError('Could not extract a Tradera listing ID from the provided URL.', {
      reason: 'invalid_listing_url',
      listingUrl,
    });
  }

  const canonicalListingUrl = buildCanonicalTraderaListingUrl(externalListingId);
  const [productRepository, listingRepository, preferredConnectionId, candidates] =
    await Promise.all([
      getProductRepository(),
      getProductListingRepository(),
      getTraderaDefaultConnectionId(),
      listTraderaConnectionCandidates(),
    ]);

  if (
    providedConnectionId &&
    !candidates.some((candidate) => candidate.connectionId === providedConnectionId)
  ) {
    throw badRequestError('Selected connection is not a configured Tradera connection.', {
      reason: 'invalid_connection_id',
      connectionId: providedConnectionId,
    });
  }

  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found.', { productId });
  }

  const sellerAlias = extractTraderaSellerAliasFromHtml(
    (await readListingHtml(canonicalListingUrl)) ?? ''
  );
  const resolution = resolveTraderaManualLinkConnection({
    candidates,
    providedConnectionId,
    preferredConnectionId,
    sellerAlias,
  });

  if (resolution.kind === 'missing') {
    throw notFoundError('No Tradera connections are configured.', {
      reason: 'no_tradera_connections',
    });
  }

  if (resolution.kind === 'ambiguous') {
    throw conflictError('Could not infer which Tradera connection should own this listing.', {
      reason: 'ambiguous_connection',
      sellerAlias: resolution.sellerAlias,
      candidateConnections: resolution.candidates.map((candidate) => ({
        integrationId: candidate.integrationId,
        integrationName: candidate.integrationName,
        integrationSlug: candidate.integrationSlug,
        connectionId: candidate.connectionId,
        connectionName: candidate.connectionName,
        connectionUsername: candidate.connectionUsername,
      })),
    });
  }

  const resolvedConnection = resolution.connection;
  const duplicateListing = (await listingRepository.getListingsByConnection(
    resolvedConnection.connectionId
  )).find(
    (listing) =>
      listing.externalListingId === externalListingId &&
      listing.productId !== productId &&
      isBlockingLinkedStatus(listing.status)
  );

  if (duplicateListing) {
    throw conflictError('This Tradera listing is already linked to another product.', {
      reason: 'listing_already_linked',
      connectionId: resolvedConnection.connectionId,
      existingListingId: duplicateListing.id,
      existingProductId: duplicateListing.productId,
      externalListingId,
    });
  }

  const linkedAt = new Date().toISOString();
  const marketplaceData = buildMarketplaceData({
    listingUrl: canonicalListingUrl,
    externalListingId,
    inferenceMethod: resolution.inferenceMethod,
    sellerAlias: resolution.sellerAlias,
    linkedAt,
  });

  const existing = await findProductListingByProductAndConnectionAcrossProviders(
    productId,
    resolvedConnection.connectionId
  );

  let listingId: string;

  if (existing) {
    await Promise.all([
      existing.repository.updateListingExternalId(existing.listing.id, externalListingId),
      existing.repository.updateListingStatus(existing.listing.id, 'active'),
      existing.repository.updateListing(existing.listing.id, {
        failureReason: null,
        lastStatusCheckAt: linkedAt,
        marketplaceData,
      }),
    ]);
    listingId = existing.listing.id;
  } else {
    const listing = await listingRepository.createListing({
      productId,
      integrationId: resolvedConnection.integrationId,
      connectionId: resolvedConnection.connectionId,
      status: 'active',
      externalListingId,
      listedAt: null,
      marketplaceData,
    });
    listingId = listing.id;
  }

  const response: TraderaProductLinkExistingResponse = {
    linked: true,
    listingId,
    connectionId: resolvedConnection.connectionId,
    integrationId: resolvedConnection.integrationId,
    externalListingId,
    listingUrl: canonicalListingUrl,
    inferenceMethod: resolution.inferenceMethod,
  };

  return NextResponse.json(response);
}
