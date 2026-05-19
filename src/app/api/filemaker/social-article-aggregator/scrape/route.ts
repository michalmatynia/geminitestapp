import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'filemaker.social-article-aggregator.scrape.POST',
  service: 'filemaker.api',
  parseJsonBody: true,
});
