export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import { POST_validator_template_handler } from '../handler';

export const POST = apiHandlerWithParams(POST_validator_template_handler, {
  source: 'products.validator-patterns.templates.POST',
});
