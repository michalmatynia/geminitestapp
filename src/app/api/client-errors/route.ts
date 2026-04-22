
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  // Browser-side error reporter can fire before CSRF cookie/header bootstrap.
  requireCsrf: false,
});
