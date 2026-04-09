import { NextRequest, NextResponse } from 'next/server';

import {
  isBaseIntegrationSlug,
  isPlaywrightProgrammableSlug,
  isTraderaIntegrationSlug,
  isVintedIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import {
  getProductListingRepository,
  listingExistsAcrossProviders,
  listProductListingsByProductIdAcrossProviders,
} from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { listCanonicalBaseProductListings } from '@/features/integrations/services/base-listing-canonicalization';
import { resolvePersistedTraderaLinkedTarget } from '@/features/integrations/services/tradera-listing/utils';
import {
  resolveRequestedVintedBrowserMode,
  resolveRequestedVintedBrowserPreference,
} from '@/features/integrations/services/vinted-listing/vinted-browser-runtime';
import {
  enqueuePlaywrightListingJob,
  enqueueTraderaListingJob,
  enqueueVintedListingJob,
  initializeQueues,
} from '@/features/jobs/server';
import { getProductRepository, parseJsonBody } from '@/features/products/server';
import { productListingCreatePayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingCreateResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { resolveError } from '@/shared/errors/resolve-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

const requireProductId = (productId: string | null | undefined): string => {
  if (!productId) {
    throw badRequestError('Product id is required');
  }
  return productId;
};

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * GET /api/v2/integrations/products/[id]/listings
 * Fetches all listings for a specific product.
 */
export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  try {
    const productId = requireProductId(params.id);
    const listings = await listCanonicalBaseProductListings(productId);
    const response = NextResponse.json(listings);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    void ErrorSystem.captureException(error);
    const resolved = resolveError(error, {
      fallbackMessage: 'Failed to load marketplace listings.',
    });
    return NextResponse.json(
      {
        error: resolved.message,
        code: resolved.code,
        ...(resolved.meta ? { details: resolved.meta } : {}),
      },
      { status: resolved.httpStatus }
    );
  }
}

/**
 * POST /api/v2/integrations/products/[id]/listings
 * Creates a new listing for a product on a marketplace.
 */
export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  try {
    const { id: productId } = params;
    if (!productId) {
      throw badRequestError('Product id is required');
    }

    const parsed = await parseJsonBody(req, productListingCreatePayloadSchema, {
      logPrefix: 'integrations.products.listings.POST',
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const templateIdProvided = Object.prototype.hasOwnProperty.call(data, 'templateId');

    // Verify product exists
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    if (!product) {
      throw notFoundError('Product not found', { productId });
    }

    // Verify integration exists
    const integrationRepo = await getIntegrationRepository();
    const integration = await integrationRepo.getIntegrationById(data.integrationId);
    if (!integration) {
      throw notFoundError('Integration not found', {
        integrationId: data.integrationId,
      });
    }

    // Verify connection exists and belongs to the integration
    const connection = await integrationRepo.getConnectionByIdAndIntegration(
      data.connectionId,
      data.integrationId
    );
    if (!connection) {
      throw notFoundError('Connection not found or does not belong to the integration', {
        connectionId: data.connectionId,
        integrationId: data.integrationId,
      });
    }

    // Check if listing already exists
    const listingRepo = await getProductListingRepository();
    const exists = await listingExistsAcrossProviders(productId, data.connectionId);
    if (exists) {
      throw conflictError('Product is already listed on this account', {
        productId,
        connectionId: data.connectionId,
      });
    }

    if (isTraderaIntegrationSlug(integration.slug)) {
      const productListings = await listProductListingsByProductIdAcrossProviders(productId);
      const linkedTraderaListing = productListings.find((listing) => {
        if (listing.connectionId !== data.connectionId) {
          return false;
        }

        const linkedTarget = resolvePersistedTraderaLinkedTarget({
          externalListingId: listing.externalListingId,
          marketplaceData: listing.marketplaceData,
        });
        return Boolean(linkedTarget.externalListingId || linkedTarget.listingUrl);
      });

      if (linkedTraderaListing) {
        const linkedTarget = resolvePersistedTraderaLinkedTarget({
          externalListingId: linkedTraderaListing.externalListingId,
          marketplaceData: linkedTraderaListing.marketplaceData,
        });
        throw conflictError('Product is already linked to a Tradera listing on this account', {
          productId,
          connectionId: data.connectionId,
          listingId: linkedTraderaListing.id,
          externalListingId: linkedTarget.externalListingId,
          listingUrl: linkedTarget.listingUrl,
        });
      }
    }

    const listing = await listingRepo.createListing({
      productId,
      integrationId: data.integrationId,
      connectionId: data.connectionId,
      status:
        isTraderaIntegrationSlug(integration.slug) ||
        isVintedIntegrationSlug(integration.slug) ||
        isPlaywrightProgrammableSlug(integration.slug)
          ? 'queued'
          : 'pending',
      marketplaceData: isTraderaIntegrationSlug(integration.slug)
        ? { marketplace: 'tradera', source: 'manual-listing' }
        : isVintedIntegrationSlug(integration.slug)
          ? { marketplace: 'vinted', source: 'manual-listing' }
          : isPlaywrightProgrammableSlug(integration.slug)
            ? { marketplace: 'playwright-programmable', source: 'manual-listing' }
            : isBaseIntegrationSlug(integration.slug)
              ? { marketplace: 'base', source: 'manual-listing' }
              : { source: 'manual-listing' },
      relistPolicy: isTraderaIntegrationSlug(integration.slug)
        ? {
          enabled: data.autoRelistEnabled ?? connection.traderaAutoRelistEnabled ?? true,
          leadMinutes:
              data.autoRelistLeadMinutes ?? connection.traderaAutoRelistLeadMinutes ?? 180,
          durationHours: data.durationHours ?? connection.traderaDefaultDurationHours ?? 72,
          templateId: templateIdProvided
            ? (data.templateId ?? null)
            : (connection.traderaDefaultTemplateId ?? null),
        }
        : null,
    });

    if (isTraderaIntegrationSlug(integration.slug)) {
      initializeQueues();
      const enqueuedAt = new Date().toISOString();
      const jobId = await enqueueTraderaListingJob({
        listingId: listing.id,
        action: 'list',
        source: 'api',
      });
      const response: ProductListingCreateResponse = {
        ...listing,
        queued: true,
        queue: {
          name: 'tradera-listings',
          jobId,
          enqueuedAt,
        },
      };
      return NextResponse.json(response, { status: 201 });
    }

    if (isVintedIntegrationSlug(integration.slug)) {
      initializeQueues();
      const enqueuedAt = new Date().toISOString();
      const requestedBrowserMode = resolveRequestedVintedBrowserMode({
        requestedBrowserMode: undefined,
        source: 'api',
        connection,
      });
      const requestedBrowserPreference = resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'api',
        connection,
      });
      const jobId = await enqueueVintedListingJob({
        listingId: listing.id,
        action: 'list',
        source: 'api',
        browserMode: requestedBrowserMode,
        browserPreference: requestedBrowserPreference,
      });
      const queuedMarketplaceData = {
        ...toRecord(listing.marketplaceData),
        marketplace: 'vinted',
        source: 'manual-listing',
        vinted: {
          ...toRecord(toRecord(listing.marketplaceData)['vinted']),
          pendingExecution: {
            action: 'list',
            requestedBrowserMode,
            requestedBrowserPreference,
            requestId: jobId,
            queuedAt: enqueuedAt,
          },
        },
      };
      await listingRepo.updateListing(listing.id, {
        marketplaceData: queuedMarketplaceData,
      });
      const response: ProductListingCreateResponse = {
        ...listing,
        marketplaceData: queuedMarketplaceData,
        queued: true,
        queue: {
          name: 'vinted-listings',
          jobId,
          enqueuedAt,
        },
      };
      return NextResponse.json(response, { status: 201 });
    }

    if (isPlaywrightProgrammableSlug(integration.slug)) {
      initializeQueues();
      const enqueuedAt = new Date().toISOString();
      const jobId = await enqueuePlaywrightListingJob({
        listingId: listing.id,
        action: 'list',
        source: 'api',
      });
      const response: ProductListingCreateResponse = {
        ...listing,
        queued: true,
        queue: {
          name: 'playwright-programmable-listings',
          jobId,
          enqueuedAt,
        },
      };
      return NextResponse.json(response, { status: 201 });
    }

    const response: ProductListingCreateResponse = listing;
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    void ErrorSystem.captureException(error);
    const resolved = resolveError(error, {
      fallbackMessage: 'Failed to create marketplace listing.',
    });
    return NextResponse.json(
      {
        error: resolved.message,
        code: resolved.code,
        ...(resolved.meta ? { details: resolved.meta } : {}),
      },
      { status: resolved.httpStatus }
    );
  }
}
