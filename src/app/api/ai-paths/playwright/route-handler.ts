export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postPlaywrightHandler } from './handler';

export const POST = apiHandler(postPlaywrightHandler, {
  source: 'ai-paths.playwright.POST',
  requireAuth: true,
});
