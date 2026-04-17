export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postEnqueueHandler } from './handler';

export const POST = apiHandler(postEnqueueHandler, {
  source: 'ai-paths.runs.enqueue.POST',
  resolveSessionUser: false,
});
