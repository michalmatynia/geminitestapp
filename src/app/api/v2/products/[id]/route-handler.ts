export const runtime = 'nodejs';
export const revalidate = 60;

import {
  deleteHandler,
  getHandler,
  patchHandler,
  putHandler,
  getQuerySchema,
} from '@/app/api/v2/products/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';


export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'v2.products.[id].GET',
  paramsSchema: idParamSchema,
  querySchema: getQuerySchema,
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.[id].PUT',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'v2.products.[id].PATCH',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.[id].DELETE',
  paramsSchema: idParamSchema,
  logSuccess: true,
  requireAuth: true,
});
