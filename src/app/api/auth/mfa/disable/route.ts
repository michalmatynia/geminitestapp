
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, payloadSchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'auth.mfa.disable.POST',
  parseJsonBody: true,
  bodySchema: payloadSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 10_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
