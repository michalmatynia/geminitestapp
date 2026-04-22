
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, registerSchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'auth.register.POST',
  parseJsonBody: true,
  bodySchema: registerSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 40_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
