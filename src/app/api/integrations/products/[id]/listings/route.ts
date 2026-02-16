export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isTraderaIntegrationSlug } from '@/features/integrations/constants/slugs';
import {
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
import { badRequestError, conflictError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const createListingSchema = z.object({
  integrationId: z.string().min(1),
  connectionId: z.string().min(1),
  durationHours: z.number().int().min(1).max(720).optional(),
  autoRelistEnabled: z.boolean().optional(),
  autoRelistLeadMinutes: z.number().int().min(0).max(10080).optional(),
  templateId: z.string().trim().nullable().optional(),
});

const isBaseIntegrationSlug = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === 'base' || normalized === 'base-com' || normalized === 'baselinker';
};

type BaseListingLinkContext = {
  integrationId: string;
  connectionId: string;
  inventoryId: string | null;
};

const resolveBaseListingLinkContext = async (): Promise<BaseListingLinkContext | null> => {
  const integrationRepo = await getIntegrationRepository();
  const integrations = await integrationRepo.listIntegrations();
  const baseIntegration = integrations.find((integration) =>
    isBaseIntegrationSlug(integration.slug)
  );
  if (!baseIntegration) return null;

  const connections = await integrationRepo.listConnections(baseIntegration.id);
  if (connections.length === 0) return null;

  const defaultConnectionId = (await getExportDefaultConnectionId())?.trim() || '';
  const preferredConnection =
    (defaultConnectionId
      ? connections.find((connection) => connection.id === defaultConnectionId)
      : null) ??
    connections.find((connection) => Boolean(connection.baseApiToken || connection.password)) ??
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

/**
 * GET /api/integrations/products/[id]/listings
 * Fetches all listings for a specific product.
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id: productId } = params;
    if (!productId) {
      throw badRequestError('Product id is required');
    }
    let listings = await listProductListingsByProductIdAcrossProviders(productId);

    const hasBaseListing = listings.some((listing) =>
      isBaseIntegrationSlug(listing.integration.slug)
    );
    if (!hasBaseListing) {
      const productRepo = await getProductRepository();
      const product = await productRepo.getProductById(productId);
      const normalizedBaseProductId = product?.baseProductId?.trim() || '';

      if (normalizedBaseProductId) {
        const linkContext = await resolveBaseListingLinkContext();
        if (linkContext) {
          const existsForConnection = await listingExistsAcrossProviders(
            productId,
            linkContext.connectionId
          );
          if (!existsForConnection) {
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
            listings = await listProductListingsByProductIdAcrossProviders(productId);
          }
        }
      }
    }

    return NextResponse.json(listings);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/products/[id]/listings
 * Creates a new listing for a product on a marketplace.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id: productId } = params;
    if (!productId) {
      throw badRequestError('Product id is required');
    }

    const parsed = await parseJsonBody(req, createListingSchema, {
      logPrefix: 'integrations.products.listings.POST'
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const templateIdProvided = Object.prototype.hasOwnProperty.call(
      data,
      'templateId'
    );

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
        integrationId: data.integrationId
      });
    }

    // Verify connection exists and belongs to the integration
    const connection = await integrationRepo.getConnectionByIdAndIntegration(
      data.connectionId,
      data.integrationId
    );
    if (!connection) {
      throw notFoundError(
        'Connection not found or does not belong to the integration',
        { connectionId: data.connectionId, integrationId: data.integrationId }
      );
    }

    // Check if listing already exists
    const listingRepo = await getProductListingRepository();
    const exists = await listingExistsAcrossProviders(productId, data.connectionId);
    if (exists) {
      throw conflictError('Product is already listed on this account', {
        productId,
        connectionId: data.connectionId
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
      relistPolicy:
        isTraderaIntegrationSlug(integration.slug)
          ? {
            enabled:
                data.autoRelistEnabled ??
                connection.traderaAutoRelistEnabled ??
                true,
            leadMinutes:
                data.autoRelistLeadMinutes ??
                connection.traderaAutoRelistLeadMinutes ??
                180,
            durationHours:
                data.durationHours ??
                connection.traderaDefaultDurationHours ??
                72,
            templateId:
                templateIdProvided
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
      return NextResponse.json(
        {
          ...listing,
          queued: true,
          queue: {
            name: 'tradera-listings',
            jobId,
            enqueuedAt,
          },
        },
        { status: 201 }
      );
    }

    return NextResponse.json(listing, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'integrations.products.[id].listings.GET', requireCsrf: false
});

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'integrations.products.[id].listings.POST', requireCsrf: false
});
