import { type NextRequest, NextResponse } from 'next/server';

import { queue1688BatchProductScans } from '@/features/products/server/product-scans-service';
import {
  product1688BatchScanRequestSchema,
  productScanBatchResponseSchema,
  type Product1688BatchScanRequest,
} from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { product1688BatchScanRequestSchema };

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as Product1688BatchScanRequest;

  const result = await queue1688BatchProductScans({
    productIds: body.productIds,
    ownerUserId: ctx.userId ?? null,
    requestInput: {
      ...(body.connectionId ? { connectionId: body.connectionId } : {}),
      ...(body.stepSequenceKey ? { stepSequenceKey: body.stepSequenceKey } : {}),
      ...(body.stepSequence ? { stepSequence: body.stepSequence } : {}),
    },
  });

  return NextResponse.json(productScanBatchResponseSchema.parse(result));
}
