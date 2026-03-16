export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_validator_template_handler } from '../handler';

export const POST = apiHandlerWithParams<{ type: string }>(POST_validator_template_handler, {
  source: 'v2.products.validator-patterns.templates.[type].POST',
  requireAuth: true,
});
