export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { playwrightStepSnippetRequestSchema } from '@/shared/contracts/playwright-steps';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.step-snippet.POST',
  parseJsonBody: true,
  bodySchema: playwrightStepSnippetRequestSchema,
  requireAuth: true,
});
