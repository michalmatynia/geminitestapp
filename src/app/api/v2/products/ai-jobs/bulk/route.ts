export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/products/ai-jobs/bulk/handler';

export const POST = apiHandler(POST_handler, { source: 'products.ai-jobs.bulk.POST' });
