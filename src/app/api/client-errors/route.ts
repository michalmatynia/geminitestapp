
import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  // Browser-side error reporter can fire before CSRF cookie/header bootstrap.
  requireCsrf: false,
});
