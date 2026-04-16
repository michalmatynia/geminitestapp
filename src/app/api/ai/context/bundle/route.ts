
import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'ai.context.bundle.POST',
  requireAuth: true,
});
