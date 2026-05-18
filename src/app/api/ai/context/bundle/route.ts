import { apiHandler } from '@/shared/lib/api/api-handler';

import { postBundleHandler } from './handler';

/**
 * POST /api/ai/context/bundle
 * 
 * Bundles AI context registry resolution bundles.
 * Requires authentication.
 */
export const POST = apiHandler(postBundleHandler, {
  source: 'ai.context.bundle.POST',
  requireAuth: true,
});
