export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'ai-paths.runtime-analytics.insights.GET',
});
export const POST = apiHandler(postHandler, {
  source: 'ai-paths.runtime-analytics.insights.POST',
});
