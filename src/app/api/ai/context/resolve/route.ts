import { apiHandler } from '@/shared/lib/api/api-handler';

import { postResolveHandler } from './handler';

/**
 * POST /api/ai/context/resolve
 * 
 * Resolves AI context registry references.
 * Requires authentication.
 */
export const POST = apiHandler(postResolveHandler, {
  source: 'ai.context.resolve.POST',
  requireAuth: true,
});
