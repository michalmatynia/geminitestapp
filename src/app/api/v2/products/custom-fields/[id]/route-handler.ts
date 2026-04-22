export const runtime = 'nodejs';

import {
  deleteHandler,
  productCustomFieldUpdateSchema,
  putHandler,
} from '@/app/api/v2/products/custom-fields/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.custom-fields.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCustomFieldUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.custom-fields.[id].DELETE',
  requireAuth: true,
});
