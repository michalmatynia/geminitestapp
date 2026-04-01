import { NextRequest, NextResponse } from 'next/server';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  getProductListingRepository,
  listingExistsAcrossProviders,
} from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { listCanonicalBaseProductListings } from '@/features/integrations/services/base-listing-canonicalization';
import { enqueueTraderaListingJob } from '@/features/jobs/server';
import { getProductRepository, parseJsonBody } from '@/features/products/server';
import {
  productListingCreatePayloadSchema,
  type ProductListingCreateResponse,
} from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const isBaseIntegrationSlug = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'base' || normalized === 'base-com' || normalized === 'baselinker';
};

const requireProductId = (productId: string | null | undefined): string => {
  if (!productId) {
    throw badRequestError('Product id is required');
  }
  return productId;
};

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
    return NextResponse.json(listings);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
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

    const listing = await listingRepo.createListing({
      productId,
      integrationId: data.integrationId,
      connectionId: data.connectionId,
      status: isTraderaIntegrationSlug(integration.slug) ? 'queued' : 'pending',
      marketplaceData: isTraderaIntegrationSlug(integration.slug)
        ? { source: 'manual-listing', marketplace: 'tradera' }
        : isBaseIntegrationSlug(integration.slug)
          ? { source: 'manual-listing', marketplace: 'base' }
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

    const response: ProductListingCreateResponse = listing;
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    void ErrorSystem.captureException(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
