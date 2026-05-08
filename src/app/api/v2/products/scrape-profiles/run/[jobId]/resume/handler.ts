import { type NextRequest, NextResponse } from 'next/server';

import { resumeProductScrapeProfileRun } from '@/server/queues/products';
import { productScrapeProfileRuntimeRunResponseSchema } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

export async function postHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { jobId: string }
): Promise<Response> {
  const run = await resumeProductScrapeProfileRun(params.jobId);
  return NextResponse.json(productScrapeProfileRuntimeRunResponseSchema.parse({ run }));
}
