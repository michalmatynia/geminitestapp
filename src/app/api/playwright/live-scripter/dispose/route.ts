import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler, liveScripterDisposeRequestSchema } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.live-scripter.dispose.POST',
  parseJsonBody: true,
  bodySchema: liveScripterDisposeRequestSchema,
  requireAuth: true,
});
