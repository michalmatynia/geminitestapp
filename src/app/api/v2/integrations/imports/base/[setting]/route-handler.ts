export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler, querySchema, type SettingParams } from './handler';

export const GET = apiHandlerWithParams<SettingParams>(getHandler, {
  source: 'v2.integrations.imports.base.[setting].GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandlerWithParams<SettingParams>(postHandler, {
  source: 'v2.integrations.imports.base.[setting].POST',
  requireAuth: true,
  requireCsrf: false,
});
