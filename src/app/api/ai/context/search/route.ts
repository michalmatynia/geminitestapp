import { apiHandler } from '@/shared/lib/api/api-handler';

import { postSearchHandler } from './handler';

export const POST = apiHandler(postSearchHandler, {
  source: 'ai.context.search.POST',
  requireAuth: true,
});
