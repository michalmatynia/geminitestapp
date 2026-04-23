export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandlerWithParams<{ id: string }>(postHandler, {
  source: 'playwright.scripters.[id].dry-run.POST',
  requireAuth: true,
});
