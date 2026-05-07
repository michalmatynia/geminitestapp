import { apiHandler } from '@/shared/lib/api/api-handler';

import { bodySchema, postHandler } from '@/app/api/query-telemetry/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.query-telemetry.POST',
  rateLimitKey: 'write',
  parseJsonBody: true,
  bodySchema,
  requireCsrf: false,
});
