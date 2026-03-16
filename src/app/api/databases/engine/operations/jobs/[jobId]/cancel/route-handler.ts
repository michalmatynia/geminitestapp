export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ jobId: string }>(POST_handler, {
  source: 'databases.engine.operations.jobs.[jobId].cancel.POST',
});
