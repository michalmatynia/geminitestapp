
import { apiHandler } from '@/shared/lib/api/api-handler';

import { payloadSchema, POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'auth.mfa.verify.POST',
  parseJsonBody: true,
  bodySchema: payloadSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 10_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
