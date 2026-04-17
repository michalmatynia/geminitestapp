export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, liveScripterDisposeRequestSchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.live-scripter.dispose.POST',
  parseJsonBody: true,
  bodySchema: liveScripterDisposeRequestSchema,
  requireAuth: true,
});
