import { apiHandler } from '@/shared/lib/api/api-handler';

import { postExecuteHandler } from './handler';

export const POST = apiHandler(postExecuteHandler, {
  source: 'ai.actions.execute.POST',
  rateLimitKey: 'write',
  requireAuth: true,
});
