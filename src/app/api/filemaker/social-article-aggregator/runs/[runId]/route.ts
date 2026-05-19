import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ runId: string }>(getHandler, {
  source: 'filemaker.social-article-aggregator.runs.[runId].GET',
  service: 'filemaker.api',
});
