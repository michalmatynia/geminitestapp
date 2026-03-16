export const runtime = 'nodejs';

import { GET_handler } from '@/app/api/v2/products/tags/all/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(GET_handler, {
  source: 'v2.products.tags.all.GET',
  requireAuth: true,
});
