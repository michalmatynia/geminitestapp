export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'chatbot.settings.GET',
  querySchema,
  requireAuth: true,
});
export const POST = apiHandler(postHandler, {
  source: 'chatbot.settings.POST',
  requireAuth: true,
});
