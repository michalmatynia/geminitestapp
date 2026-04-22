export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.programmable.connections.cleanupBrowserPersistence.POST',
  requireCsrf: false,
  requireAuth: true,
});
