export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postKangurAiTutorChatHandler } from './handler';

export const POST = apiHandler(postKangurAiTutorChatHandler, {
  source: 'kangur.ai-tutor.chat.POST',
  service: 'kangur.api',
  successLogging: 'off',
});
