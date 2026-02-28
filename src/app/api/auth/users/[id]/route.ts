export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteAuthUserHandler, patchAuthUserHandler, updateSchema } from './handler';

export const PATCH = apiHandlerWithParams<{ id: string }>(patchAuthUserHandler, {
  source: 'auth.users.[id].PATCH',
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: 'write',
  maxBodyBytes: 20_000,
  allowedMethods: ['PATCH'],
  requireCsrf: false,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteAuthUserHandler, {
  source: 'auth.users.[id].DELETE',
  rateLimitKey: 'write',
  allowedMethods: ['DELETE'],
  requireCsrf: false,
});
