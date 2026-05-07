import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/app/api/client-errors/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  requireCsrf: false,
});
