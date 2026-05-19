import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.social-article-aggregator.source-presets.GET',
  service: 'filemaker.api',
});

export const POST = apiHandler(postHandler, {
  source: 'filemaker.social-article-aggregator.source-presets.POST',
  service: 'filemaker.api',
  parseJsonBody: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'filemaker.social-article-aggregator.source-presets.DELETE',
  service: 'filemaker.api',
});
