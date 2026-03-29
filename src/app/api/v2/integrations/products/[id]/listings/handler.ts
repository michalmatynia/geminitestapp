import { NextRequest, NextResponse } from 'next/server';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
  findProductListingByIdAcrossProviders,
  getExportDefaultConnectionId,
  getExportDefaultInventoryId,
  getProductListingRepository,
  listingExistsAcrossProviders,
  listProductListingsByProductIdAcrossProviders,
} from '@/features/integrations/server';
import { getIntegrationRepository } from '@/features/integrations/server';
import { enqueueTraderaListingJob } from '@/features/jobs/server';
import { getProductRepository } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
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

type BaseListingLinkContext = {
  integrationId: string;
  connectionId: string;
  inventoryId: string | null;
};

type ProductListings = Awaited<ReturnType<typeof listProductListingsByProductIdAcrossProviders>>;

const requireProductId = (productId: string | null | undefined): string => {
  if (!productId) {
    throw badRequestError('Product id is required');
  }
  return productId;
};

const resolveBaseListingLinkContext = async (): Promise<BaseListingLinkContext | null> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration: (typeof integrations)[number]) =>
    isBaseIntegrationSlug(integration.slug)
  );
  if (!baseIntegration) return null;

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) return null;

  const defaultConnectionId = (await getExportDefaultConnectionId())?.trim() || '';
  const preferredConnection =
    (defaultConnectionId
      ? connections.find(
        (connection: (typeof connections)[number]) => connection.id === defaultConnectionId
      )
      : null) ??
    connections.find((connection: (typeof connections)[number]) =>
      Boolean(connection.baseApiToken)
    ) ??
    connections[0] ??
    null;
  if (!preferredConnection?.id) return null;

  const defaultInventoryId = (await getExportDefaultInventoryId())?.trim() || '';
  return {
    integrationId: baseIntegration.id,
    connectionId: preferredConnection.id,
    inventoryId: defaultInventoryId || null,
  };
};

const syncBaseListingsWithProductId = async (
  productId: string,
  normalizedBaseProductId: string,
  listings: ProductListings
): Promise<ProductListings> => {
  if (!normalizedBaseProductId) {
    return listings;
  }

  const baseListingsWithoutExternalId = listings.filter(
    (listing: ProductListings[number]) =>
      isBaseIntegrationSlug(listing.integration.slug) && !listing.externalListingId?.trim()
  );
  if (baseListingsWithoutExternalId.length === 0) {
    return listings;
  }

  await Promise.all(
    baseListingsWithoutExternalId.map(async (listing) => {
      const resolved = await findProductListingByIdAcrossProviders(listing.id);
      if (!resolved) {
        return;
      }

      await resolved.repository.updateListingExternalId(listing.id, normalizedBaseProductId);
      if ((resolved.listing.status ?? '').trim().length === 0) {
        await resolved.repository.updateListingStatus(listing.id, 'active');
      }
    })
  );

  return listProductListingsByProductIdAcrossProviders(productId);
};

const backfillBaseListingIfMissing = async (
  productId: string,
  normalizedBaseProductId: string,
  listings: ProductListings
): Promise<ProductListings> => {
  if (!normalizedBaseProductId) {
    return listings;
  }
  if (listings.some((listing: ProductListings[number]) => isBaseIntegrationSlug(listing.integration.slug))) {
    return listings;
  }

  const linkContext = await resolveBaseListingLinkContext();
  if (!linkContext) {
    return listings;
  }

  const existsForConnection = await listingExistsAcrossProviders(productId, linkContext.connectionId);
  if (existsForConnection) {
    return listings;
  }

  const listingRepo = await getProductListingRepository();
  await listingRepo.createListing({
    productId,
    integrationId: linkContext.integrationId,
    connectionId: linkContext.connectionId,
    status: 'active',
    externalListingId: normalizedBaseProductId,
    inventoryId: linkContext.inventoryId,
    marketplaceData: {
      source: 'base-import-backfill',
      marketplace: 'base',
    },
  });

  return listProductListingsByProductIdAcrossProviders(productId);
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
    let listings = await listProductListingsByProductIdAcrossProviders(productId);
    const productRepo = await getProductRepository();
    const product = await productRepo.getProductById(productId);
    const normalizedBaseProductId = product?.baseProductId?.trim() || '';

    listings = await syncBaseListingsWithProductId(
      productId,
      normalizedBaseProductId,
      listings
    );
    listings = await backfillBaseListingIfMissing(productId, normalizedBaseProductId, listings);

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
