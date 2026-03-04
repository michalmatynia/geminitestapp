export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  createPatternSchema,
  getValidatorPatternsHandler,
  postValidatorPatternsHandler,
} from '@/app/api/products/validator-patterns/handler';

export const GET = apiHandler(getValidatorPatternsHandler, {
  source: 'products.validator-patterns.GET',
  cacheControl: 'no-store',
});

export const POST = apiHandler(postValidatorPatternsHandler, {
  source: 'products.validator-patterns.POST',
  parseJsonBody: true,
  bodySchema: createPatternSchema,
});
