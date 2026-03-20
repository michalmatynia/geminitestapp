export const runtime = 'nodejs';

import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';

import {
  deleteValidatorPatternByIdHandler,
  putValidatorPatternByIdHandler,
  updatePatternSchema,
} from '@/app/api/v2/products/validator-patterns/[id]/handler';

export const PUT = apiHandlerWithParams<{ id: string }>(putValidatorPatternByIdHandler, {
  source: 'v2.products.validator-patterns.[id].PUT',
  parseJsonBody: true,
  bodySchema: updatePatternSchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteValidatorPatternByIdHandler, {
  source: 'v2.products.validator-patterns.[id].DELETE',
});
