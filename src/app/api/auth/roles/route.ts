export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, PATCH_handler, updateSchema } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'auth.roles.GET',
  resolveSessionUser: false,
});

export const PATCH = apiHandler(PATCH_handler, {
  source: 'auth.roles.PATCH',
  parseJsonBody: true,
  bodySchema: updateSchema,
  rateLimitKey: 'write',
  maxBodyBytes: 500_000,
  allowedMethods: ['PATCH'],
  requireCsrf: false,
  resolveSessionUser: false,
});
