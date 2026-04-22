export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'chatbot.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'chatbot.POST',
  requireAuth: true,
});
