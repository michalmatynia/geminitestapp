export const runtime = 'nodejs';

import {
  batchDecisionSchema,
  POST_handler,
} from '@/app/api/v2/products/validator-decisions/batch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validator-decisions.batch.POST',
  parseJsonBody: true,
  bodySchema: batchDecisionSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});
