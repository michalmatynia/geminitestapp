export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_validator_template_handler } from '../../../../v2/products/validator-patterns/templates/handler';

export const POST = apiHandler(
  (req, ctx) => POST_validator_template_handler(req, ctx, { type: 'name-segment-dimensions' }),
  { source: 'products.validator-patterns.templates.name-segment-dimensions.POST' }
);
