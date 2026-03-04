import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

const updateListingSchema = z.object({
  inventoryId: z.string().trim().min(1).nullable(),
});

/**
 * DELETE /api/integrations/products/[id]/listings/[listingId]
 * Marks a listing as removed from a marketplace.
 */
export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }

  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (!resolved) {
    throw notFoundError('Listing not found', { listingId });
  }
  const listing = resolved.listing;

  // Verify it belongs to this product
  if (listing.productId !== productId) {
    throw notFoundError('Listing not found', { listingId, productId });
  }

  await resolved.repository.updateListingStatus(listingId, 'removed');

  return NextResponse.json({ status: 'removed' });
}

/**
 * PATCH /api/integrations/products/[id]/listings/[listingId]
 * Updates listing metadata (e.g., inventoryId).
 */
export async function PATCH_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }
  const resolved = await findProductListingByIdAcrossProviders(listingId);
  if (resolved?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { listingId, productId });
  }

  const parsed = await parseJsonBody(req, updateListingSchema, {
    logPrefix: 'integrations.products.listings.PATCH',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  await resolved.repository.updateListingInventoryId(listingId, data.inventoryId ?? null);
  return NextResponse.json({ success: true });
}
