import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from '@/shared/server/api/client-errors/handler';

export const POST = apiHandler(postHandler, {
  source: 'cms-builder-web.client-errors.POST',
  parseJsonBody: false,
  rateLimitKey: 'write',
  requireCsrf: false,
});
