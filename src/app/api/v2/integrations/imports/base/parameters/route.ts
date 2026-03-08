export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { getBaseImportParametersHandler, postBaseImportParametersHandler } from './handler';

export const POST = apiHandler(postBaseImportParametersHandler, {
  source: 'v2.integrations.imports.base.parameters.POST',
  requireCsrf: false,
});

export const GET = apiHandler(getBaseImportParametersHandler, {
  source: 'v2.integrations.imports.base.parameters.GET',
});
