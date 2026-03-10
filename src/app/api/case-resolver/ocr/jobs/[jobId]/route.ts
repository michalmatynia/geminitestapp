export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, {
  source: 'case-resolver.ocr.jobs.[jobId].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, {
  source: 'case-resolver.ocr.jobs.[jobId].POST',
  requireAuth: true,
});
