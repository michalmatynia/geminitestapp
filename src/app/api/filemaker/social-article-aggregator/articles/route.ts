import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.social-article-aggregator.articles.GET',
  service: 'filemaker.api',
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'filemaker.social-article-aggregator.articles.DELETE',
  service: 'filemaker.api',
});
