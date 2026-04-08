export const runtime = 'nodejs';

import {
  DELETE_handler,
  productCustomFieldUpdateSchema,
  PUT_handler,
} from '@/app/api/v2/products/custom-fields/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.custom-fields.[id].PUT',
  parseJsonBody: true,
  bodySchema: productCustomFieldUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.custom-fields.[id].DELETE',
  requireAuth: true,
});
