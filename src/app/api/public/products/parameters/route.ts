
import { apiHandler } from '@/shared/lib/api/api-handler';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'public.products.parameters.GET',
  querySchema: catalogIdQuerySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
});
