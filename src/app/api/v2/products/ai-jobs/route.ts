export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  DELETE_handler,
  GET_handler,
  deleteQuerySchema,
  listQuerySchema,
} from '@/app/api/v2/products/ai-jobs/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.ai-jobs.GET',
  querySchema: listQuerySchema,
  requireAuth: true,
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'v2.products.ai-jobs.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
