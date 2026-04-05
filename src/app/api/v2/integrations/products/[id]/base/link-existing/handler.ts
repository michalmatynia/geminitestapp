import { NextRequest, NextResponse } from 'next/server';

import {
  findProductListingByProductAndConnectionAcrossProviders,
  getIntegrationRepository,
  getProductListingRepository,
} from '@/features/integrations/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getProductRepository } from '@/features/products/server';
import { baseProductLinkExistingPayloadSchema } from '@/shared/contracts/integrations/listings';
import { type BaseProductLinkExistingResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const requestSchema = baseProductLinkExistingPayloadSchema;

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

  const response: BaseProductLinkExistingResponse = {
    linked: true,
    listingId,
    externalListingId,
  };
  return NextResponse.json(response);
}
