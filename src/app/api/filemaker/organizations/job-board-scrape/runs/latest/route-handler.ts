import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'filemaker.organizations.job-board-scrape.runs.latest.GET',
});
