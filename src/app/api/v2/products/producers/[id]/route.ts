export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  DELETE_handler,
  producerUpdateSchema,
  PUT_handler,
} from '@/app/api/v2/products/producers/[id]/handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.producers.[id].PUT',
  parseJsonBody: true,
  bodySchema: producerUpdateSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.producers.[id].DELETE',
});
