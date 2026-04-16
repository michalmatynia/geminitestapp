
import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, bodySchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'query-telemetry.POST',
  rateLimitKey: 'write',
  parseJsonBody: true,
  bodySchema,
  requireCsrf: false,
});
