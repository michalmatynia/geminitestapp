export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  DELETE_handler,
  productParameterUpdateSchema,
  PUT_handler,
} from '@/app/api/v2/products/parameters/[id]/handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.parameters.[id].PUT',
  parseJsonBody: true,
  bodySchema: productParameterUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.parameters.[id].DELETE',
});
