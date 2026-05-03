export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler, postHandler, deleteQuerySchema } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(getHandler, {
  source: 'chatbot.jobs.[jobId].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'chatbot.jobs.[jobId].POST',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ jobId: string }>(deleteHandler, {
  source: 'chatbot.jobs.[jobId].DELETE',
  querySchema: deleteQuerySchema,
  requireAuth: true,
});
