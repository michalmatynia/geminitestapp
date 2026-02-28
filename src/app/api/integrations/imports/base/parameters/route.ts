export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getBaseImportParametersHandler, postBaseImportParametersHandler } from './handler';

export const POST = apiHandler(postBaseImportParametersHandler, {
  source: 'products.imports.base.parameters.POST',
  requireCsrf: false,
});

export const GET = apiHandler(getBaseImportParametersHandler, {
  source: 'products.imports.base.parameters.GET',
  requireCsrf: false,
});
