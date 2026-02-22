export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  evaluateRuntimeSchema,
  POST_handler,
} from './handler';

export const POST = apiHandler(
  POST_handler,
  {
    source: 'products.validator-runtime.evaluate.POST',
    parseJsonBody: true,
    bodySchema: evaluateRuntimeSchema,
    cacheControl: 'no-store',
  }
);
