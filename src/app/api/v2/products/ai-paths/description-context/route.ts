export const runtime = 'nodejs';
export const revalidate = 60;

import { GET_handler } from '@/app/api/v2/products/ai-paths/description-context/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';
import { descriptionContextQuerySchema } from '@/shared/validations/product-metadata-api-schemas';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.ai-paths.description-context.GET',
  cacheControl: 'no-store',
  querySchema: descriptionContextQuerySchema,
  rateLimitKey: 'search',
});
