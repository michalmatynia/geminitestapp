import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.social-article-aggregator.source-presets.seed.GET',
  service: 'filemaker.api',
});

export const POST = apiHandler(postHandler, {
  source: 'filemaker.social-article-aggregator.source-presets.seed.POST',
  service: 'filemaker.api',
  parseJsonBody: true,
});
