export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler, deleteQuerySchema } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, {
  source: 'chatbot.jobs.[jobId].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, {
  source: 'chatbot.jobs.[jobId].POST',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ jobId: string }>(DELETE_handler, {
  source: 'chatbot.jobs.[jobId].DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
