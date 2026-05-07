import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, registerSchema } from '@/app/api/auth/register/handler';

export const POST = apiHandler(postHandler, {
  source: 'database-engine-web.auth.register.POST',
  parseJsonBody: true,
  bodySchema: registerSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 40_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
