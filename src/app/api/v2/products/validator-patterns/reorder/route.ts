export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, reorderPayloadSchema } from '@/app/api/products/validator-patterns/reorder/handler';

export const POST = apiHandler(POST_handler, {
  source: 'products.validator-patterns.reorder.POST',
  parseJsonBody: true,
  bodySchema: reorderPayloadSchema,
});
