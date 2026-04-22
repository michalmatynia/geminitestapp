export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'v2.integrations.connections.[id].promotePlaywrightBrowserOwnership.POST',
  requireCsrf: false,
  requireAuth: true,
});
