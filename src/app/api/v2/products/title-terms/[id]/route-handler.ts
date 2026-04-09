export const runtime = 'nodejs';

import {
  DELETE_handler,
  PUT_handler,
  titleTermUpdateSchema,
} from '@/app/api/v2/products/title-terms/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'v2.products.title-terms.[id].PUT',
  parseJsonBody: true,
  bodySchema: titleTermUpdateSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: 'v2.products.title-terms.[id].DELETE',
  requireAuth: true,
});
