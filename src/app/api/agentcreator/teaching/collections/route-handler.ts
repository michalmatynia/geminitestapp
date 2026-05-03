export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'agentcreator.teaching.collections.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'agentcreator.teaching.collections.POST',
  requireAuth: true,
});
