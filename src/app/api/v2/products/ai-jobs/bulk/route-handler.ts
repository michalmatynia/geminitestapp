export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { postHandler } from '@/app/api/v2/products/ai-jobs/bulk/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.ai-jobs.bulk.POST',
  requireAuth: true,
});
