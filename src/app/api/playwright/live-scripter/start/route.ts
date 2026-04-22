import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, liveScripterStartRequestSchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.live-scripter.start.POST',
  parseJsonBody: true,
  bodySchema: liveScripterStartRequestSchema,
  requireAuth: true,
});
