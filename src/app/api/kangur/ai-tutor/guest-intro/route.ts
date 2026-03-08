export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getKangurAiTutorGuestIntroHandler } from './handler';

export const GET = apiHandler(getKangurAiTutorGuestIntroHandler, {
  source: 'kangur.ai-tutor.guest-intro.GET',
  service: 'kangur.api',
  successLogging: 'off',
  resolveSessionUser: false,
});
