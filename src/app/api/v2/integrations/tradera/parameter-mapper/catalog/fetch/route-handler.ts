export const runtime = 'nodejs';

import {
  POST_handler,
  traderaParameterMapperCatalogFetchRequestSchema,
} from '@/app/api/v2/integrations/tradera/parameter-mapper/catalog/fetch/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(POST_handler, {
  source: 'v2.integrations.tradera.parameter-mapper.catalog.fetch.POST',
  parseJsonBody: true,
  bodySchema: traderaParameterMapperCatalogFetchRequestSchema,
  requireAuth: true,
});
