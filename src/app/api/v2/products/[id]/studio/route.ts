export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';

import { GET_handler, PUT_handler } from '@/app/api/products/[id]/studio/handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.[id].studio.GET',
  paramsSchema: idParamSchema,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.[id].studio.PUT',
  paramsSchema: idParamSchema,
  logSuccess: true,
});
