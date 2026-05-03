export const runtime = 'nodejs';

import {
  postHandler,
  productParseActionsMatchRequestSchema,
} from '@/app/api/v2/products/parse-actions/match/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.parse-actions.match.POST',
  parseJsonBody: true,
  bodySchema: productParseActionsMatchRequestSchema,
  requireAuth: true,
});
