export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, patchHandler } from './handler';

export const GET = apiHandlerWithParams<{ agentId: string }>(getHandler, {
  source: 'agentcreator.teaching.agents.[agentId].GET',
  requireAuth: true,
});

export const PATCH = apiHandlerWithParams<{ agentId: string }>(patchHandler, {
  source: 'agentcreator.teaching.agents.[agentId].PATCH',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ agentId: string }>(deleteHandler, {
  source: 'agentcreator.teaching.agents.[agentId].DELETE',
  requireAuth: true,
});
