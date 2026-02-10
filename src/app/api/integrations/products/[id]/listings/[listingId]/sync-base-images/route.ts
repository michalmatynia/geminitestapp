export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { syncBaseImagesForListing } from '@/features/integrations/services/base-image-sync';
import { parseJsonBody } from '@/features/products/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const syncSchema = z.object({
  inventoryId: z.string().min(1).optional()
});

async function POST_handler(
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
    allowEmpty: true
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const result = await syncBaseImagesForListing(listingId, productId, data.inventoryId ?? null);

  return NextResponse.json({
    status: 'synced',
    count: result.count,
    added: result.added
  });
}

export const POST = apiHandlerWithParams<{ id: string; listingId: string }>(
  POST_handler,
  { source: 'integrations.products.[id].listings.[listingId].sync-base-images.POST', requireCsrf: false }
);
