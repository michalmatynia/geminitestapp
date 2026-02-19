export const runtime = 'nodejs';
export const revalidate = 60;

import { apiHandler } from '@/shared/lib/api/api-handler';
import { catalogIdQuerySchema } from '@/shared/validations/product-metadata-api-schemas';

import { GET_handler } from './handler';

export const GET = apiHandler(GET_handler, {
  source: 'public.products.categories.GET',
  querySchema: catalogIdQuerySchema,
  rateLimitKey: 'search',
  cacheControl: 'no-store',
});
