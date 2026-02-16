export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, registerSchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'auth.register.POST',
  parseJsonBody: true,
  bodySchema: registerSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 40_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
