export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ jobId: string }>(postHandler, {
  source: 'databases.engine.operations.jobs.[jobId].cancel.POST',
});
