export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler } from '@/app/api/v2/products/validator-config/handler';

export const GET = apiHandler(GET_handler, {
  source: 'products.validator-config.GET',
  cacheControl: 'no-store',
});
