export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, PATCH_handler, POST_handler } from './handler';

export const POST = apiHandler(POST_handler, { source: 'chatbot.sessions.POST' });

export const GET = apiHandler(GET_handler, { source: 'chatbot.sessions.GET' });

export const PATCH = apiHandler(PATCH_handler, {
  source: 'chatbot.sessions.PATCH',
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'chatbot.sessions.DELETE',
});
