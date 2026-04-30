import { type NextRequest, NextResponse } from 'next/server';

import { checkScrapedSourceProductStatus } from '@/features/products/server/product-scraped-source';
import {
  productScrapedSourceActionRequestSchema,
  productScrapedSourceActionResponseSchema,
  type ProductScrapedSourceActionRequest,
} from '@/shared/contracts/products/scraped-source';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScrapedSourceActionRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductScrapedSourceActionRequest;
  const result = await checkScrapedSourceProductStatus(body.productId);
  return NextResponse.json(productScrapedSourceActionResponseSchema.parse(result));
}
