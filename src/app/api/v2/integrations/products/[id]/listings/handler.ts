import { type NextRequest, NextResponse } from 'next/server';

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
import { enqueueTraderaCreateListingResponse } from '@/features/integrations/services/tradera-listing-create-queue';
import {
  resolveTraderaCreateListingDecision,
} from '@/features/integrations/services/tradera-listing-create-guard';
import {
  resolveRequestedVintedBrowserMode,
  resolveRequestedVintedBrowserPreference,
} from '@/features/integrations/services/vinted-listing/vinted-browser-runtime';
import {
  enqueuePlaywrightListingJob,
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
export async function getHandler(
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
export async function postHandler(
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

    const listingRepo = await getProductListingRepository();

    if (isTraderaIntegrationSlug(integration.slug)) {
      const productListings = await listProductListingsByProductIdAcrossProviders(productId);
      const traderaDecision = await resolveTraderaCreateListingDecision({
        productId,
        connectionId: data.connectionId,
        productListings,
        listingRepository: listingRepo,
      });

      if (traderaDecision.type === 'queued') {
        return NextResponse.json(traderaDecision.response, { status: 200 });
      }
      if (traderaDecision.type === 'conflict') {
        throw conflictError(traderaDecision.message, {
          productId,
          connectionId: data.connectionId,
          ...traderaDecision.details,
        });
      }
    } else {
      const exists = await listingExistsAcrossProviders(productId, data.connectionId);
      if (exists) {
        throw conflictError('Product is already listed on this account', {
          productId,
          connectionId: data.connectionId,
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
      const response = await enqueueTraderaCreateListingResponse({
        listing,
        listingRepository: listingRepo,
      });
      return NextResponse.json(response, { status: 201 });
    }

    if (isVintedIntegrationSlug(integration.slug)) {
      initializeQueues();
      const enqueuedAt = new Date().toISOString();
      const requestedBrowserMode = resolveRequestedVintedBrowserMode({
        requestedBrowserMode: undefined,
        source: 'api',
      });
      const requestedBrowserPreference = resolveRequestedVintedBrowserPreference({
        requestedBrowserPreference: undefined,
        source: 'api',
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
