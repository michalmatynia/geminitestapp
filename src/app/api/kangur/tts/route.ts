export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurTtsHandler } from './handler';

export const POST = apiHandler(postKangurTtsHandler, {
  source: 'kangur.tts.POST',
  service: 'kangur.api',
  successLogging: 'all',
});
