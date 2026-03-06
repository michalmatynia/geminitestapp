export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';

import {
  DELETE_handler,
  GET_handler,
  PATCH_handler,
  PUT_handler,
} from '@/app/api/v2/products/[id]/handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.[id].GET',
  paramsSchema: idParamSchema,
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.[id].PUT',
  paramsSchema: idParamSchema,
  logSuccess: true,
});

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'products.[id].PATCH',
  paramsSchema: idParamSchema,
  logSuccess: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.[id].DELETE',
  paramsSchema: idParamSchema,
  logSuccess: true,
});
