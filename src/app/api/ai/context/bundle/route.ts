import { apiHandler } from '@/shared/lib/api/api-handler';

import { postBundleHandler } from './handler';

export const POST = apiHandler(postBundleHandler, {
  source: 'ai.context.bundle.POST',
  requireAuth: true,
});
