export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurAiTutorUsageHandler } from './handler';

export const GET = apiHandler(getKangurAiTutorUsageHandler, {
  source: 'kangur.ai-tutor.usage.GET',
  service: 'kangur.api',
  successLogging: 'off',
});
