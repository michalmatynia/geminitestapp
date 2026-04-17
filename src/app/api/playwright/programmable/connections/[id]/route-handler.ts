export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { PUT_handler } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: 'playwright.programmable.connections.[id].PUT',
  requireCsrf: false,
  requireAuth: true,
});
