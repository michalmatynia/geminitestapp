export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import { baseImportRunReportQuerySchema } from '@/shared/contracts/integrations';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'v2.integrations.imports.base.runs.[runId].report.GET',
  querySchema: baseImportRunReportQuerySchema,
  requireAuth: true,
});
