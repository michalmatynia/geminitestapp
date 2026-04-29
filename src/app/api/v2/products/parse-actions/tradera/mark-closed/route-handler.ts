export const runtime = 'nodejs';

import {
  postHandler,
  productParseActionsMarkTraderaClosedRequestSchema,
} from '@/app/api/v2/products/parse-actions/tradera/mark-closed/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.parse-actions.tradera.mark-closed.POST',
  parseJsonBody: true,
  bodySchema: productParseActionsMarkTraderaClosedRequestSchema,
  requireAuth: true,
});
