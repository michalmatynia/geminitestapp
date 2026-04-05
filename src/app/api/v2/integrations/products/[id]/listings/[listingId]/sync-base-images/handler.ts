import { NextRequest, NextResponse } from 'next/server';

import { syncBaseImagesForListing } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import { productListingSyncBaseImagesPayloadSchema } from '@/shared/contracts/integrations/listings';
import { type ProductListingSyncBaseImagesResponse } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }

  const parsed = await parseJsonBody(_req, productListingSyncBaseImagesPayloadSchema, {
    logPrefix: 'integrations.products.listings.SYNC_BASE_IMAGES',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const result = await syncBaseImagesForListing(listingId, productId, data.inventoryId ?? null);

  const response: ProductListingSyncBaseImagesResponse = {
    status: 'synced',
    count: result.count,
    added: result.added,
  };

  return NextResponse.json(response);
}
