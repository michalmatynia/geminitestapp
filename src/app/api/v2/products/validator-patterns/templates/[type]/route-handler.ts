export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { postValidatorTemplateHandler } from '../handler';

export const POST = apiHandlerWithParams<{ type: string }>(postValidatorTemplateHandler, {
  source: 'v2.products.validator-patterns.templates.[type].POST',
  requireAuth: true,
});
