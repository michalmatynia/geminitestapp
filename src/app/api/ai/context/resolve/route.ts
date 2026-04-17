import { apiHandler } from '@/shared/lib/api/api-handler';

import { postResolveHandler } from './handler';

export const POST = apiHandler(postResolveHandler, {
  source: 'ai.context.resolve.POST',
  requireAuth: true,
});
