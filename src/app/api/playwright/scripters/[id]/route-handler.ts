export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { deleteHandler, getHandler } from './handler';

export const GET = apiHandlerWithParams<{ id: string }>(getHandler, {
  source: 'playwright.scripters.[id].GET',
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteHandler, {
  source: 'playwright.scripters.[id].DELETE',
  requireAuth: true,
});
