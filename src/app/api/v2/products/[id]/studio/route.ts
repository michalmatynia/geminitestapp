export const runtime = 'nodejs';

import { GET_handler, PUT_handler } from '@/app/api/v2/products/[id]/studio/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';


export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.[id].studio.GET',
  paramsSchema: idParamSchema,
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.[id].studio.PUT',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});
