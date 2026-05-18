import { apiHandler } from '@/shared/lib/api/api-handler';

import { postExecuteHandler } from './handler';

/**
 * POST /api/ai/actions/execute
 * 
 * Executes an AI action request.
 * Requires authentication and is rate-limited.
 */
export const POST = apiHandler(postExecuteHandler, {
  source: 'ai.actions.execute.POST',
  rateLimitKey: 'write',
  requireAuth: true,
});
