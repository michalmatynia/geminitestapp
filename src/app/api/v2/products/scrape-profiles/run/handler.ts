import { type NextRequest, NextResponse } from 'next/server';

import { initializeQueues } from '@/features/jobs/server';
import { runProductScrapeProfileViaRedisRuntime } from '@/server/queues/products';
import {
  productScrapeProfileRunLaunchResponseSchema,
  productScrapeProfileRunRequestSchema,
  type ProductScrapeProfileRunRequest,
} from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export { productScrapeProfileRunRequestSchema };

export async function postHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const body = ctx.body as ProductScrapeProfileRunRequest;
  initializeQueues();
  const result = await runProductScrapeProfileViaRedisRuntime(body, { userId: ctx.userId ?? null });
  return NextResponse.json(productScrapeProfileRunLaunchResponseSchema.parse(result), {
    status: 202,
  });
}
