export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  POST_handler,
  reorderPayloadSchema,
} from '@/app/api/v2/products/validator-patterns/reorder/handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validator-patterns.reorder.POST',
  parseJsonBody: true,
  bodySchema: reorderPayloadSchema,
});
