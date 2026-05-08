export const runtime = 'nodejs';

import { postHandler } from '@/app/api/v2/products/scrape-profiles/run/[jobId]/pause/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'v2.products.scrape-profiles.run.[jobId].pause.POST',
  requireAuth: true,
});
