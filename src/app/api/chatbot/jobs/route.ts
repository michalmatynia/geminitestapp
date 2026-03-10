export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler, deleteQuerySchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'chatbot.jobs.GET',
  requireAuth: true,
});

export const POST = apiHandler(POST_handler, {
  source: 'chatbot.jobs.POST',
  requireAuth: true,
});

export const DELETE = apiHandler(DELETE_handler, {
  source: 'chatbot.jobs.DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
