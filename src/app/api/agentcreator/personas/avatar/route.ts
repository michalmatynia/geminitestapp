export const runtime = 'nodejs';
export const maxDuration = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, POST_handler, deleteQuerySchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'agentcreator.personas.avatar.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'agentcreator.personas.avatar.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
