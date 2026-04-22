export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getHandler, postHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'playwright.programmable.connections.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'playwright.programmable.connections.POST',
  requireCsrf: false,
  requireAuth: true,
});
