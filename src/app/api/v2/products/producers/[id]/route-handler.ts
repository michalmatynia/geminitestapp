export const runtime = 'nodejs';

import {
  deleteHandler,
  producerUpdateSchema,
  putHandler,
} from '@/app/api/v2/products/producers/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'v2.products.producers.[id].PUT',
  parseJsonBody: true,
  bodySchema: producerUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'v2.products.producers.[id].DELETE',
  requireAuth: true,
});
