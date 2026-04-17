export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { playwrightActionSequenceSnippetRequestSchema } from '@/shared/contracts/playwright-steps';

import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.action-snippet.POST',
  parseJsonBody: true,
  bodySchema: playwrightActionSequenceSnippetRequestSchema,
  requireAuth: true,
});
