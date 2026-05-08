import { type NextRequest, NextResponse } from 'next/server';

import {
  readActiveProductScrapeProfileRun,
  readLatestProductScrapeProfileRun,
  readProductScrapeProfileRun,
} from '@/server/queues/products';
import { productScrapeProfileRuntimeSnapshotSchema } from '@/shared/contracts/products/scrape-profiles';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const readJobIdFromRequest = (req: NextRequest): string | null => {
  const jobId = req.nextUrl.searchParams.get('jobId')?.trim() ?? '';
  return jobId.length > 0 ? jobId : null;
};

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const jobId = readJobIdFromRequest(req);
  const run =
    jobId !== null
      ? await readProductScrapeProfileRun(jobId)
      : (await readActiveProductScrapeProfileRun()) ?? (await readLatestProductScrapeProfileRun());

  return NextResponse.json(productScrapeProfileRuntimeSnapshotSchema.parse({ run }));
}
