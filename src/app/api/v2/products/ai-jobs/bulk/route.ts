export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { POST_handler } from '@/app/api/v2/products/ai-jobs/bulk/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, { source: 'v2.products.ai-jobs.bulk.POST' });
