export const runtime = 'nodejs';

import {
  deleteHandler,
  productTagUpdateSchema,
  putHandler,
} from '@/app/api/v2/products/tags/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.tags.[id].PUT',
  parseJsonBody: true,
  bodySchema: productTagUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.tags.[id].DELETE',
  requireAuth: true,
});
