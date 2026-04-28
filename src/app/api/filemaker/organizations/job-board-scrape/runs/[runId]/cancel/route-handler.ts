import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ runId: string }>(postHandler, {
  source: 'filemaker.organizations.job-board-scrape.runs.[runId].cancel.POST',
});
