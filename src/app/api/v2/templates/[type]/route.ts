
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { getTemplatesHandler, postTemplatesHandler } from '../handler';

export const GET = apiHandlerWithParams<{ type: string }>(getTemplatesHandler, {
  source: 'v2.templates.[type].GET',
  requireAuth: true,
});

export const POST = apiHandlerWithParams<{ type: string }>(postTemplatesHandler, {
  source: 'v2.templates.[type].POST',
  requireAuth: true,
});
