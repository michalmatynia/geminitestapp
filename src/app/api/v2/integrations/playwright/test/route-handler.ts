export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { postHandler } from './handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.integrations.playwright.test.POST',
  requireAuth: true,
  requireCsrf: false,
});
