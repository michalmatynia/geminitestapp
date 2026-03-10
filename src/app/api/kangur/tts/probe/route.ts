export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { kangurLessonTtsProbeRequestSchema } from '@/features/kangur/tts/contracts';
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurTtsProbeHandler } from './handler';

export const POST = apiHandler(postKangurTtsProbeHandler, {
  source: 'kangur.tts.probe.POST',
  service: 'kangur.api',
  successLogging: 'all',
  parseJsonBody: true,
  bodySchema: kangurLessonTtsProbeRequestSchema,
});
