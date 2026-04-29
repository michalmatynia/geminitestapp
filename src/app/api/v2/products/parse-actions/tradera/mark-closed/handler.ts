import { type NextRequest, NextResponse } from 'next/server';

import { markParsedTraderaMatchesClosed } from '@/features/products/server/product-parse-actions';
import {
  productParseActionsMarkTraderaClosedRequestSchema,
  productParseActionsMarkTraderaClosedResponseSchema,
  type ProductParseActionsMarkTraderaClosedRequest,
} from '@/shared/contracts/products/parse-actions';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productParseActionsMarkTraderaClosedRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductParseActionsMarkTraderaClosedRequest;
  const response = await markParsedTraderaMatchesClosed(body.matches);
  return NextResponse.json(productParseActionsMarkTraderaClosedResponseSchema.parse(response));
}
