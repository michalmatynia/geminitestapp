
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(getHandler, {
  source: 'case-resolver.ocr.jobs.[jobId].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'case-resolver.ocr.jobs.[jobId].POST',
  requireAuth: true,
});
