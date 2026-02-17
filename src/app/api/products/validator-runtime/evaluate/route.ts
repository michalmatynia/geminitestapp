export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  evaluateRuntimeSchema,
  postValidatorRuntimeEvaluateHandler,
} from './handler';

export const POST = apiHandler(
  postValidatorRuntimeEvaluateHandler,
  {
    source: 'products.validator-runtime.evaluate.POST',
    parseJsonBody: true,
    bodySchema: evaluateRuntimeSchema,
    cacheControl: 'no-store',
  }
);
