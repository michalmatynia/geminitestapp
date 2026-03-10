export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { GET_templates_handler, POST_templates_handler } from '../handler';

export const GET = apiHandlerWithParams<{ type: string }>(GET_templates_handler, {
  source: 'v2.templates.[type].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ type: string }>(POST_templates_handler, {
  source: 'v2.templates.[type].POST',
  requireAuth: true,
});
