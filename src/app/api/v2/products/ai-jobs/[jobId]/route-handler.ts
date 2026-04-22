export const runtime = 'nodejs';

import {
  deleteHandler,
  getHandler,
  postHandler,
} from '@/app/api/v2/products/ai-jobs/[jobId]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const GET = apiHandlerWithParams<{ jobId: string }>(getHandler, {
  source: 'v2.products.ai-jobs.[jobId].GET',
  requireAuth: true,
});
export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'v2.products.ai-jobs.[jobId].POST',
  requireAuth: true,
});
export const DELETE = apiHandlerWithParams<{ jobId: string }>(deleteHandler, {
  source: 'v2.products.ai-jobs.[jobId].DELETE',
  requireAuth: true,
});
