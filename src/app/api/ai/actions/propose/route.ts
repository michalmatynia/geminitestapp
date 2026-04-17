import { apiHandler } from '@/shared/lib/api/api-handler';

import { postProposeHandler } from './handler';

export const POST = apiHandler(postProposeHandler, {
  source: 'ai.actions.propose.POST',
  rateLimitKey: 'write',
  requireAuth: true,
});
