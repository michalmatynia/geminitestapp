export const runtime = 'nodejs';

import {
  createPatternSchema,
  getValidatorPatternsHandler,
  postValidatorPatternsHandler,
} from '@/app/api/v2/products/validator-patterns/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getValidatorPatternsHandler, {
  source: 'v2.products.validator-patterns.GET',
  cacheControl: 'no-store',
  requireAuth: true,
});

export const POST = apiHandler(postValidatorPatternsHandler, {
  source: 'v2.products.validator-patterns.POST',
  parseJsonBody: true,
  bodySchema: createPatternSchema,
  requireAuth: true,
});
