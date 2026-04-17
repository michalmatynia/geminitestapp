export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_handler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(POST_handler, {
  source: 'v2.integrations.connections.[id].promotePlaywrightBrowserOwnership.POST',
  requireCsrf: false,
  requireAuth: true,
});
