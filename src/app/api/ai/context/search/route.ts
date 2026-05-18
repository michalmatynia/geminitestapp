import { apiHandler } from '@/shared/lib/api/api-handler';

import { postSearchHandler } from './handler';

/**
 * POST /api/ai/context/search
 * 
 * Searches the AI context registry.
 * Requires authentication.
 */
export const POST = apiHandler(postSearchHandler, {
  source: 'ai.context.search.POST',
  requireAuth: true,
});
