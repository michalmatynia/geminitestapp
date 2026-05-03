export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { baseImportRunDetailQuerySchema } from '@/shared/contracts/integrations/base-com';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(getHandler, {
  source: 'v2.integrations.imports.base.runs.[runId].GET',
  querySchema: baseImportRunDetailQuerySchema,
  requireAuth: true,
});
