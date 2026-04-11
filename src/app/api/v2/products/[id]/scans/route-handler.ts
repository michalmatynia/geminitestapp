export const runtime = 'nodejs';

import { GET_handler, querySchema } from '@/app/api/v2/products/[id]/scans/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { idParamSchema } from '@/shared/validations/api-schemas';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'v2.products.[id].scans.GET',
  paramsSchema: idParamSchema,
  querySchema,
  cacheControl: 'no-store',
  requireAuth: true,
});
