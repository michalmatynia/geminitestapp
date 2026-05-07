
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, bodySchema } from '@/shared/server/api/query-telemetry/handler';

export const POST = apiHandler(postHandler, {
  source: 'query-telemetry.POST',
  rateLimitKey: 'write',
  parseJsonBody: true,
  bodySchema,
  requireCsrf: false,
});
