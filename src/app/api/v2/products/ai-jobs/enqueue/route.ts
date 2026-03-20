export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/v2/products/ai-jobs/enqueue/handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.ai-jobs.enqueue.POST',
});
