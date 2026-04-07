export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, querySchema, type SettingParams } from './handler';

export const GET = apiHandlerWithParams<SettingParams>(GET_handler, {
  source: 'v2.integrations.exports.vinted.[setting].GET',
  querySchema,
  requireAuth: true,
});

export const POST = apiHandlerWithParams<SettingParams>(POST_handler, {
  source: 'v2.integrations.exports.vinted.[setting].POST',
  requireCsrf: false,
  requireAuth: true,
});
