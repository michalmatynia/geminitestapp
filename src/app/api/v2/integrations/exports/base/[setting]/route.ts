export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, type SettingParams } from './handler';

export const GET = apiHandlerWithParams<SettingParams>(
  GET_handler,
  {
    source: 'products.exports.base.setting.GET',
    requireCsrf: false,
  }
);

export const POST = apiHandlerWithParams<SettingParams>(
  POST_handler,
  {
    source: 'products.exports.base.setting.POST',
    requireCsrf: false,
  }
);
