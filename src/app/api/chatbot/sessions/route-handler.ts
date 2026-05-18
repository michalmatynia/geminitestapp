export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler, postHandler } from './handler';

/**
 * Chatbot Sessions API
 * 
 * Manages chatbot sessions:
 * - GET: Fetch session list.
 * - POST: Create new session.
 * - PATCH: Update session.
 * - DELETE: Delete session.
 * Requires authentication.
 */

export const POST = apiHandler(postHandler, {
  source: 'chatbot.sessions.POST',
  requireAuth: true,
});
...

export const GET = apiHandler(getHandler, {
  source: 'chatbot.sessions.GET',
  requireAuth: true,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'chatbot.sessions.PATCH',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'chatbot.sessions.DELETE',
  requireAuth: true,
});
