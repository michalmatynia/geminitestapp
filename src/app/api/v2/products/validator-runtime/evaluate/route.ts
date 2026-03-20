export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  evaluateRuntimeSchema,
  POST_handler,
} from '@/app/api/v2/products/validator-runtime/evaluate/handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validator-runtime.evaluate.POST',
  parseJsonBody: true,
  bodySchema: evaluateRuntimeSchema,
  cacheControl: 'no-store',
});
