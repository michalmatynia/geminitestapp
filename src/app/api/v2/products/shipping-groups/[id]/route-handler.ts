export const runtime = 'nodejs';

import {
  DELETE_handler,
  productShippingGroupUpdateSchema,
  PUT_handler,
} from '@/app/api/v2/products/shipping-groups/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.shipping-groups.[id].PUT',
  parseJsonBody: true,
  bodySchema: productShippingGroupUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.shipping-groups.[id].DELETE',
  requireAuth: true,
});
