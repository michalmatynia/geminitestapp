export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurTtsStatusHandler } from './handler';

export const POST = apiHandler(postKangurTtsStatusHandler, {
  source: 'kangur.tts.status.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
