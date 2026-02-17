export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { DELETE_handler, GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, {
  source: 'products.ai-jobs.[jobId].GET',
});
export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, {
  source: 'products.ai-jobs.[jobId].POST',
});
export const DELETE = apiHandlerWithParams<{ jobId: string }>(DELETE_handler, {
  source: 'products.ai-jobs.[jobId].DELETE',
});
