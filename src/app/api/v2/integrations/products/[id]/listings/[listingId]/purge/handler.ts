import { NextRequest, NextResponse } from 'next/server';

import { findProductListingByIdAcrossProviders } from '@/features/integrations/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

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
  if (resolved?.listing.productId !== productId) {
    throw notFoundError('Listing not found', { listingId, productId });
  }

  await resolved.repository.deleteListing(listingId);
  return new NextResponse(null, { status: 204 });
}
