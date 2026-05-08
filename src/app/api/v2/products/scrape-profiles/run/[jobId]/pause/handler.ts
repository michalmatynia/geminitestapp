import { type NextRequest, NextResponse } from 'next/server';

import { pauseProductScrapeProfileRun } from '@/server/queues/products';
import { productScrapeProfileRuntimeRunResponseSchema } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const run = await pauseProductScrapeProfileRun(params.jobId);
  return NextResponse.json(productScrapeProfileRuntimeRunResponseSchema.parse({ run }));
}
