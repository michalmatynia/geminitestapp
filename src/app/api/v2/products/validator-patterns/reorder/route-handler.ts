export const runtime = 'nodejs';

import {
  postHandler,
  reorderPayloadSchema,
} from '@/app/api/v2/products/validator-patterns/reorder/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.validator-patterns.reorder.POST',
  parseJsonBody: true,
  bodySchema: reorderPayloadSchema,
  requireAuth: true,
});
