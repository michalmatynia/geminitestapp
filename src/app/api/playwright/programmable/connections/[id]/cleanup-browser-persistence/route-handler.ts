export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'playwright.programmable.connections.[id].cleanupBrowserPersistence.POST',
  requireCsrf: false,
  requireAuth: true,
});
