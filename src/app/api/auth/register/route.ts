
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, registerSchema } from '@/features/auth/server/api/register/handler';

/**
 * POST /api/auth/register
 * 
 * Registers a new user account.
 * Requires JSON payload matching registration schema.
 * Rate-limited under 'auth' key.
 */
export const POST = apiHandler(postHandler, {
  source: 'auth.register.POST',
  parseJsonBody: true,
  bodySchema: registerSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 40_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
