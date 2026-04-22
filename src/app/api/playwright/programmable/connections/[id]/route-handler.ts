export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { putHandler } from './handler';

export const PUT = apiHandlerWithParams<{ id: string }>(putHandler, {
  source: 'playwright.programmable.connections.[id].PUT',
  requireCsrf: false,
  requireAuth: true,
});
