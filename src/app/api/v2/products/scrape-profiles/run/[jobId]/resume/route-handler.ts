export const runtime = 'nodejs';

import { postHandler } from '@/app/api/v2/products/scrape-profiles/run/[jobId]/resume/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'v2.products.scrape-profiles.run.[jobId].resume.POST',
  requireAuth: true,
});
