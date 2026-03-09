export const runtime = 'nodejs';

import {
  DELETE_handler,
  GET_handler,
  POST_handler,
} from '@/app/api/v2/products/ai-jobs/[jobId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, {
  source: 'v2.products.ai-jobs.[jobId].GET',
});
export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, {
  source: 'v2.products.ai-jobs.[jobId].POST',
});
export const DELETE = apiHandlerWithParams<{ jobId: string }>(DELETE_handler, {
  source: 'v2.products.ai-jobs.[jobId].DELETE',
});
