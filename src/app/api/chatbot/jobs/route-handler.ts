export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler, deleteQuerySchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'chatbot.jobs.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'chatbot.jobs.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(deleteHandler, {
  source: 'chatbot.jobs.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
