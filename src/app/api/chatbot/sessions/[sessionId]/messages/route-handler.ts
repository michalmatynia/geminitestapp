export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ sessionId: string }>(getHandler, {
  source: 'chatbot.sessions.[sessionId].messages.GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ sessionId: string }>(postHandler, {
  source: 'chatbot.sessions.[sessionId].messages.POST',
  requireAuth: true,
});
