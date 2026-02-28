import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { syncBaseImagesForListing } from '@/shared/lib/integrations/services/base-image-sync';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const syncSchema = z.object({
  inventoryId: z.string().min(1).optional(),
});

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string; listingId: string }
): Promise<Response> {
  const { id: productId, listingId } = params;
  if (!productId || !listingId) {
    throw badRequestError('Product id and listing id are required');
  }

  const parsed = await parseJsonBody(_req, syncSchema, {
    logPrefix: 'integrations.products.listings.SYNC_BASE_IMAGES',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const result = await syncBaseImagesForListing(listingId, productId, data.inventoryId ?? null);

  return NextResponse.json({
    status: 'synced',
    count: result.count,
    added: result.added,
  });
}
