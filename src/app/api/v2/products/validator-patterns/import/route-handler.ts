export const runtime = 'nodejs';

import {
  postValidatorPatternsImportHandler,
  postValidatorPatternsImportSchema,
} from '@/app/api/v2/products/validator-patterns/import/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postValidatorPatternsImportHandler, {
  source: 'v2.products.validator-patterns.import.POST',
  parseJsonBody: true,
  bodySchema: postValidatorPatternsImportSchema,
  requireAuth: true,
});
