export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  deleteHandler,
  getHandler,
  deleteQuerySchema,
  listQuerySchema,
} from '@/app/api/v2/products/ai-jobs/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.ai-jobs.GET',
  querySchema: listQuerySchema,
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'v2.products.ai-jobs.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
