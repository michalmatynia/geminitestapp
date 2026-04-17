export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler, liveScripterStartRequestSchema } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.live-scripter.start.POST',
  parseJsonBody: true,
  bodySchema: liveScripterStartRequestSchema,
  requireAuth: true,
});
