export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(GET_handler, {
  source: 'v2.integrations.imports.base.runs.[runId].report.GET',
});
