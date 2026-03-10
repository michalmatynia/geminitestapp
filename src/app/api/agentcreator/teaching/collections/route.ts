export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'agentcreator.teaching.collections.GET',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'agentcreator.teaching.collections.POST',
  requireAuth: true,
});
