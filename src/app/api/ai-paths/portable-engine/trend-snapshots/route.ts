export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'ai-paths.portable-engine.trend-snapshots.GET',
});
