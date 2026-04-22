export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';
import { playwrightStepSnippetRequestSchema } from '@/shared/contracts/playwright-steps';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.step-snippet.POST',
  parseJsonBody: true,
  bodySchema: playwrightStepSnippetRequestSchema,
  requireAuth: true,
});
