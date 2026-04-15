import { NextRequest, NextResponse } from 'next/server';

import { queueAmazonBatchProductScans } from '@/features/products/server/product-scans-service';
import {
  productAmazonBatchScanRequestSchema,
  productAmazonBatchScanResponseSchema,
  type ProductAmazonBatchScanRequest,
} from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productAmazonBatchScanRequestSchema };

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductAmazonBatchScanRequest;

  const result = await queueAmazonBatchProductScans({
    productIds: body.productIds,
    userId: ctx.userId ?? null,
    stepSequenceKey: body.stepSequenceKey ?? null,
    stepSequence: body.stepSequence ?? null,
  });

  return NextResponse.json(productAmazonBatchScanResponseSchema.parse(result));
}
