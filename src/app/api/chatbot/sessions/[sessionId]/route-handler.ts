export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler } from './handler';

export const GET = apiHandlerWithParams<{ sessionId: string }>(getHandler, {
  source: 'chatbot.sessions.[sessionId].GET',
  requireAuth: true,
});
