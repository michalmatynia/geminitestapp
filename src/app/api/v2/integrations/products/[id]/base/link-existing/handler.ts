import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  findProductListingByProductAndConnectionAcrossProviders,
  getIntegrationRepository,
  getProductListingRepository,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { getProductRepository } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const requestSchema = z.object({
  connectionId: z.string().trim().min(1),
  inventoryId: z.string().trim().min(1),
  externalListingId: z.string().trim().min(1),
});

const BASE_INTEGRATION_SLUGS = new Set(['baselinker', 'base-com', 'base']);

const isBaseIntegrationSlug = (value: string | null | undefined): boolean => {
  const normalized = (value ?? '').trim().toLowerCase();
  return BASE_INTEGRATION_SLUGS.has(normalized);
};

/**
 * POST /api/v2/integrations/products/[id]/base/link-existing
 * Links product to an already existing Base.com product_id without exporting.
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
    logPrefix: 'integrations.products.base.link-existing.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const connectionId = parsed.data.connectionId.trim();
  const inventoryId = parsed.data.inventoryId.trim();
  const externalListingId = parsed.data.externalListingId.trim();

  const [productRepository, integrationRepository] = await Promise.all([
    getProductRepository(),
    getIntegrationRepository(),
  ]);

  const product = await productRepository.getProductById(productId);
  if (!product) {
    throw notFoundError('Product not found.', { productId });
  }

  const connection = await integrationRepository.getConnectionById(connectionId);
  if (!connection) {
    throw notFoundError('Connection not found.', { connectionId });
  }

  const integration = await integrationRepository.getIntegrationById(connection.integrationId);
  if (!integration || !isBaseIntegrationSlug(integration.slug)) {
    throw badRequestError('Selected connection is not a Base.com integration.', {
      connectionId,
    });
  }

  const existing = await findProductListingByProductAndConnectionAcrossProviders(
    productId,
    connectionId
  );

  let listingId: string;

  if (existing) {
    await Promise.all([
      existing.repository.updateListingExternalId(existing.listing.id, externalListingId),
      existing.repository.updateListingInventoryId(existing.listing.id, inventoryId),
      existing.repository.updateListingStatus(existing.listing.id, 'active'),
    ]);
    listingId = existing.listing.id;
  } else {
    const listingRepository = await getProductListingRepository();
    const listing = await listingRepository.createListing({
      productId,
      integrationId: connection.integrationId,
      connectionId,
      status: 'active',
      externalListingId,
      inventoryId,
      marketplaceData: {
        source: 'manual-link-by-sku',
        marketplace: 'base',
      },
    });
    listingId = listing.id;
  }

  return NextResponse.json({
    linked: true,
    listingId,
    externalListingId,
  });
}
