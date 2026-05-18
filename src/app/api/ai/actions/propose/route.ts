import { apiHandler } from '@/shared/lib/api/api-handler';

import { postProposeHandler } from './handler';

/**
 * POST /api/ai/actions/propose
 * 
 * Proposes a new AI action request.
 * Requires authentication and is rate-limited.
 */
export const POST = apiHandler(postProposeHandler, {
  source: 'ai.actions.propose.POST',
  rateLimitKey: 'write',
  requireAuth: true,
});
