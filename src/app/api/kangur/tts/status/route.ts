export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurLessonTtsStatusRequestSchema } from '@/features/kangur/tts/contracts';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurTtsStatusHandler } from './handler';

export const POST = apiHandler(postKangurTtsStatusHandler, {
  source: 'kangur.tts.status.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLessonTtsStatusRequestSchema,
});
