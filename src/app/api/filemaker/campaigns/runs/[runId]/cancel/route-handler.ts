export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(postHandler, {
  source: 'filemaker.campaigns.runs.[runId].cancel.POST',
  requireAuth: true,
});
