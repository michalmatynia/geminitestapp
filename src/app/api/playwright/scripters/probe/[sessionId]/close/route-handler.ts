export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ sessionId: string }>(postHandler, {
  source: 'playwright.scripters.probe.[sessionId].close.POST',
  requireAuth: true,
});
