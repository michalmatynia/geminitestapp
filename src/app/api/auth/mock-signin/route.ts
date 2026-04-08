
import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, payloadSchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'auth.mock-signin.POST',
  parseJsonBody: true,
  bodySchema: payloadSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 20_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
