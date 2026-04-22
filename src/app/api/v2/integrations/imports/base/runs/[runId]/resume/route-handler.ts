export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(postHandler, {
  source: 'v2.integrations.imports.base.runs.[runId].resume.POST',
  requireAuth: true,
  requireCsrf: false,
});
