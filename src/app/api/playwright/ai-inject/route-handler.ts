export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { playwrightAiInjectRequestSchema, postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.ai-inject.POST',
  parseJsonBody: true,
  bodySchema: playwrightAiInjectRequestSchema,
  requireAuth: true,
});
