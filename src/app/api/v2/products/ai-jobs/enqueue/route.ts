export const runtime = 'nodejs';

import { POST_handler } from '@/app/api/v2/products/ai-jobs/enqueue/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.ai-jobs.enqueue.POST',
  requireAuth: true,
});
