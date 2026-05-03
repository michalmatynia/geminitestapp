import { type NextRequest, NextResponse } from 'next/server';

import { runProductScrapeProfile } from '@/features/products/server/product-scrape-profiles';
import {
  productScrapeProfileRunRequestSchema,
  productScrapeProfileRunResponseSchema,
  type ProductScrapeProfileRunRequest,
} from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScrapeProfileRunRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductScrapeProfileRunRequest;
  const result = await runProductScrapeProfile(body, { userId: ctx.userId ?? null });
  return NextResponse.json(productScrapeProfileRunResponseSchema.parse(result));
}
