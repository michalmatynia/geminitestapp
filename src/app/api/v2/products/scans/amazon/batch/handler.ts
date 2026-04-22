import { type NextRequest, NextResponse } from 'next/server';

import { queueAmazonBatchProductScans } from '@/features/products/server/product-scans-service';
import {
  productScanBatchRequestSchema,
  productScanBatchResponseSchema,
  type ProductScanBatchRequest,
} from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScanBatchRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductScanBatchRequest;

  const result = await queueAmazonBatchProductScans({
    productIds: body.productIds,
    ownerUserId: ctx.userId ?? null,
    requestInput: {
      ...(body.selectorProfile ? { selectorProfile: body.selectorProfile } : {}),
      ...(body.imageSearchPageUrl ? { imageSearchPageUrl: body.imageSearchPageUrl } : {}),
      ...(body.stepSequenceKey ? { stepSequenceKey: body.stepSequenceKey } : {}),
      ...(body.stepSequence ? { stepSequence: body.stepSequence } : {}),
    },
  });

  return NextResponse.json(productScanBatchResponseSchema.parse(result));
}
