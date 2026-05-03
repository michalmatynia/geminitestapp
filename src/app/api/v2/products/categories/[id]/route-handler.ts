export const runtime = 'nodejs';

import {
  deleteHandler,
  getHandler,
  putHandler,
  productCategoryUpdateSchema,
} from '@/app/api/v2/products/categories/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'v2.products.categories.[id].GET',
  requireAuth: true,
});

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.categories.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCategoryUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.categories.[id].DELETE',
  requireAuth: true,
});
