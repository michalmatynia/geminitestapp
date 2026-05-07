import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, registerSchema } from '@/features/auth/server/api/register/handler';

export const POST = apiHandler(postHandler, {
  source: 'cms-builder-web.auth.register.POST',
  parseJsonBody: true,
  bodySchema: registerSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 40_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
