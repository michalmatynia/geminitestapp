
import { apiHandler } from '@/shared/lib/api/api-handler';

import { payloadSchema, postHandler } from './handler';

/**
 * POST /api/auth/mfa/verify
 * 
 * Verifies MFA (Multi-Factor Authentication) token.
 * Requires JSON payload matching MFA verification schema.
 * Rate-limited under 'auth' key.
 */
export const POST = apiHandler(postHandler, {
  source: 'auth.mfa.verify.POST',
  parseJsonBody: true,
  bodySchema: payloadSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 10_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
