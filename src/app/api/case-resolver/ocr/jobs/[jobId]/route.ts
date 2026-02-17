export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler } from './handler';

export const GET = apiHandlerWithParams<{ jobId: string }>(GET_handler, {
  source: 'case-resolver.ocr.jobs.[jobId].GET',
});

