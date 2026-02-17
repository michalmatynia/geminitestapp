export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { createDecisionSchema, POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'products.validator-decisions.POST',
  parseJsonBody: true,
  bodySchema: createDecisionSchema,
  cacheControl: 'no-store',
});
