export const runtime = 'nodejs';

import {
  DELETE_handler,
  GET_handler,
  PUT_handler,
  productCategoryUpdateSchema,
} from '@/app/api/v2/products/categories/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.categories.[id].GET',
});

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.categories.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCategoryUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.categories.[id].DELETE',
});
