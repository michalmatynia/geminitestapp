
import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, payloadSchema } from './handler';

/**
 * POST /api/auth/verify-credentials
 * 
 * Verifies user credentials.
 * Requires JSON payload matching credentials verification schema.
 * Rate-limited under 'auth' key.
 */
export const POST = apiHandler(postHandler, {
  source: 'auth.verify-credentials.POST',
  parseJsonBody: true,
  bodySchema: payloadSchema,
  rateLimitKey: 'auth',
  maxBodyBytes: 20_000,
  allowedMethods: ['POST'],
  requireCsrf: false,
});
