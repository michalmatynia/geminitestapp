export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, PATCH_handler, updateSchema } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(GET_handler, {
  source: 'auth.users.[id].security.GET',
});

export const PATCH = apiHandlerWithParams<{ id: string }>(PATCH_handler, {
  source: 'auth.users.[id].security.PATCH',
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: 'write',
  maxBodyBytes: 20_000,
  allowedMethods: ['PATCH'],
  requireCsrf: false,
});
