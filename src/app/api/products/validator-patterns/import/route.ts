export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import {
  postValidatorPatternsImportHandler,
  postValidatorPatternsImportSchema,
} from './handler';

export const POST = apiHandler(postValidatorPatternsImportHandler, {
  source: 'products.validator-patterns.import.POST',
  parseJsonBody: true,
  bodySchema: postValidatorPatternsImportSchema,
});
