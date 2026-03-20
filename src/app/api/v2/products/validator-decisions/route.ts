export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  createDecisionSchema,
  POST_handler,
} from '@/app/api/v2/products/validator-decisions/handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validator-decisions.POST',
  parseJsonBody: true,
  bodySchema: createDecisionSchema,
  cacheControl: 'no-store',
});
