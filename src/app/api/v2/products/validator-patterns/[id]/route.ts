export const runtime = 'nodejs';

import {
  deleteValidatorPatternByIdHandler,
  putValidatorPatternByIdHandler,
  updatePatternSchema,
} from '@/app/api/v2/products/validator-patterns/[id]/handler';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';


export const PUT = apiHandlerWithParams<{ id: string }>(putValidatorPatternByIdHandler, {
  source: 'v2.products.validator-patterns.[id].PUT',
  parseJsonBody: true,
  bodySchema: updatePatternSchema,
  requireAuth: true,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(deleteValidatorPatternByIdHandler, {
  source: 'v2.products.validator-patterns.[id].DELETE',
  requireAuth: true,
});
