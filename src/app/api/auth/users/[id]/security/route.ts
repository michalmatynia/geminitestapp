
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, patchHandler, updateSchema } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'auth.users.[id].security.GET',
});

export const PATCH = apiHandlerWithParams<{ id: string }>(patchHandler, {
  source: 'auth.users.[id].security.PATCH',
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: 'write',
  maxBodyBytes: 20_000,
  allowedMethods: ['PATCH'],
  requireCsrf: false,
});
