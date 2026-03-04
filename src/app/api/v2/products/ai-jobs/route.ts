export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler } from '@/app/api/products/ai-jobs/handler';

export const GET = apiHandler(GET_handler, { source: 'products.ai-jobs.GET' });

export const DELETE = apiHandler(DELETE_handler, { source: 'products.ai-jobs.DELETE' });
