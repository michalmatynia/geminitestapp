
import { apiHandler } from '@/shared/lib/api/api-handler';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

import { getHandler } from './handler';

export const GET = apiHandler(getHandler, {
  source: 'public.products.parameters.GET',
  querySchema: catalogIdQuerySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
});
