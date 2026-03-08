export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: 'v2.integrations.imports.base.runs.[runId].resume.POST',
  requireCsrf: false,
});
