export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, PUT_handler, priceGroupSchema } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'price-groups.[id].PUT',
  parseJsonBody: true,
  bodySchema: priceGroupSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'price-groups.[id].DELETE',
});
