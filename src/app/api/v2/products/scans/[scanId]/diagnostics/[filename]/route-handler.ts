export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, paramsSchema } from './handler';

export const GET = apiHandlerWithParams<{ scanId: string; filename: string }>(getHandler, {
  source: 'v2.products.scans.[scanId].diagnostics.[filename].GET',
  paramsSchema,
  cacheControl: 'no-store',
  requireAuth: true,
});
