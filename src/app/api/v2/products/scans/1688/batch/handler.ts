import { NextRequest, NextResponse } from 'next/server';

import { queue1688BatchProductScans } from '@/features/products/server/product-scans-service';
import {
  productScanBatchRequestSchema,
  productScanBatchResponseSchema,
  type ProductScanBatchRequest,
} from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScanBatchRequestSchema };

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductScanBatchRequest;

  const result = await queue1688BatchProductScans({
    productIds: body.productIds,
    userId: ctx.userId ?? null,
  });

  return NextResponse.json(productScanBatchResponseSchema.parse(result));
}
