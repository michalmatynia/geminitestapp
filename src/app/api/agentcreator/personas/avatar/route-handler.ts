export const runtime = 'nodejs';
export const maxDuration = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, postHandler, deleteQuerySchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'agentcreator.personas.avatar.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'agentcreator.personas.avatar.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
