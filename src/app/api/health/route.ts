import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'health.GET',
  fallbackMessage: 'Database ping failed',
});
