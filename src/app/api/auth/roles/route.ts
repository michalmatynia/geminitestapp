
import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler, updateSchema } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'auth.roles.GET',
  resolveSessionUser: false,
});

export const PATCH = apiHandler(patchHandler, {
  source: 'auth.roles.PATCH',
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: 'write',
  maxBodyBytes: 500_000,
  allowedMethods: ['PATCH'],
  requireCsrf: false,
  resolveSessionUser: false,
});
