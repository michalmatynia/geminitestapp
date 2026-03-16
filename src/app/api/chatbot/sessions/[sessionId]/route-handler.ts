export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ sessionId: string }>(GET_handler, {
  source: 'chatbot.sessions.[sessionId].GET',
  requireAuth: true,
});
