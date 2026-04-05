export const runtime = 'nodejs';
export const revalidate = 300;

import {
  GET_handler,
  POST_handler,
  productShippingGroupCreateSchema,
  querySchema,
} from '@/app/api/v2/products/shipping-groups/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.shipping-groups.GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.shipping-groups.POST',
  parseJsonBody: true,
  bodySchema: productShippingGroupCreateSchema,
  requireAuth: true,
});
