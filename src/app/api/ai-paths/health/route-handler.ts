export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHealthHandler } from './handler';

export const GET = apiHandler(getHealthHandler, {
  source: 'ai-paths.health.GET',
});
