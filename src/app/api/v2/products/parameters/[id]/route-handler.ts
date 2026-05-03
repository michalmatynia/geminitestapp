export const runtime = 'nodejs';

import {
  deleteHandler,
  productParameterUpdateSchema,
  putHandler,
} from '@/app/api/v2/products/parameters/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.parameters.[id].PUT',
  parseJsonBody: true,
  bodySchema: productParameterUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.parameters.[id].DELETE',
  requireAuth: true,
});
