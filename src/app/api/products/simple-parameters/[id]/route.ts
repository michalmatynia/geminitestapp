export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  DELETE_handler,
  productSimpleParameterUpdateSchema,
  PUT_handler,
} from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.simple-parameters.[id].PUT',
  parseJsonBody: true,
  bodySchema: productSimpleParameterUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.simple-parameters.[id].DELETE',
});
