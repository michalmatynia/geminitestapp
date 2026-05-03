export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { playwrightAiStepEvaluateRequestSchema } from './handler';
import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'playwright.ai-step-evaluate.POST',
  parseJsonBody: true,
  bodySchema: playwrightAiStepEvaluateRequestSchema,
  requireAuth: true,
});
