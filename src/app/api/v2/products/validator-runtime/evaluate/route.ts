export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import {
  evaluateRuntimeSchema,
  POST_handler,
} from '@/app/api/v2/products/validator-runtime/evaluate/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validator-runtime.evaluate.POST',
  parseJsonBody: true,
  bodySchema: evaluateRuntimeSchema,
  cacheControl: 'no-store',
});
