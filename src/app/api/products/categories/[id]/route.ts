export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  DELETE_handler,
  GET_handler,
  PUT_handler,
  productCategoryUpdateSchema,
} from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'products.categories.[id].GET',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.categories.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCategoryUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.categories.[id].DELETE',
});
