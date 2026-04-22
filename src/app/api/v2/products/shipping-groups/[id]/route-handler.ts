export const runtime = 'nodejs';

import {
  deleteHandler,
  productShippingGroupUpdateSchema,
  putHandler,
} from '@/app/api/v2/products/shipping-groups/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.shipping-groups.[id].PUT',
  parseJsonBody: true,
  bodySchema: productShippingGroupUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.shipping-groups.[id].DELETE',
  requireAuth: true,
});
