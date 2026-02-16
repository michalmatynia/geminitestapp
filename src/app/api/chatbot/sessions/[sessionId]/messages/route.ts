export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ sessionId: string }>(GET_handler, {
  source: 'chatbot.sessions.[sessionId].messages.GET',
});

export const POST = apiHandlerWithParams<{ sessionId: string }>(POST_handler, {
  source: 'chatbot.sessions.[sessionId].messages.POST',
});
