export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, productTagUpdateSchema, PUT_handler } from '@/app/api/products/tags/[id]/handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'products.tags.[id].PUT',
  parseJsonBody: true,
  bodySchema: productTagUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'products.tags.[id].DELETE',
});
