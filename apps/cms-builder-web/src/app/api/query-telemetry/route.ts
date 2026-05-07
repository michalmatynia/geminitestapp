import { apiHandler } from '@/shared/lib/api/api-handler';

import { bodySchema, postHandler } from '@/shared/server/api/query-telemetry/handler';

export const POST = apiHandler(postHandler, {
  source: 'cms-builder-web.query-telemetry.POST',
  rateLimitKey: 'write',
  parseJsonBody: true,
  bodySchema,
  requireCsrf: false,
});
