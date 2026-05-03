import { type NextRequest, NextResponse } from 'next/server';

import { matchParsedProductActions } from '@/features/products/server/product-parse-actions';
import {
  productParseActionsMatchRequestSchema,
  productParseActionsMatchResponseSchema,
  type ProductParseActionsMatchRequest,
} from '@/shared/contracts/products/parse-actions';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productParseActionsMatchRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductParseActionsMatchRequest;
  const response = await matchParsedProductActions(body.text);
  return NextResponse.json(productParseActionsMatchResponseSchema.parse(response));
}
