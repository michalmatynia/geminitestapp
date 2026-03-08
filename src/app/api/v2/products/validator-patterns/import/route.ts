export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  postValidatorPatternsImportHandler,
  postValidatorPatternsImportSchema,
} from '@/app/api/v2/products/validator-patterns/import/handler';

export const POST = apiHandler(postValidatorPatternsImportHandler, {
  source: 'v2.products.validator-patterns.import.POST',
  parseJsonBody: true,
  bodySchema: postValidatorPatternsImportSchema,
});
