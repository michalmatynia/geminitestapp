export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { playwrightAiStepEvaluateRequestSchema } from './handler';
import { POST_handler } from './handler';

export const POST = apiHandler(POST_handler, {
  source: 'playwright.ai-step-evaluate.POST',
  parseJsonBody: true,
  bodySchema: playwrightAiStepEvaluateRequestSchema,
  requireAuth: true,
});
