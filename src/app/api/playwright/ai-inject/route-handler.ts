export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { playwrightAiInjectRequestSchema, POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.ai-inject.POST',
  parseJsonBody: true,
  bodySchema: playwrightAiInjectRequestSchema,
  requireAuth: true,
});
