export const runtime = 'nodejs';
export const revalidate = 60;

import {
  DELETE_handler,
  GET_handler,
  PATCH_handler,
  PUT_handler,
  getQuerySchema,
} from '@/app/api/v2/products/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';


export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.[id].GET',
  paramsSchema: idParamSchema,
  querySchema: getQuerySchema,
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.[id].PUT',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'v2.products.[id].PATCH',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.[id].DELETE',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});
