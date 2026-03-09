export const runtime = 'nodejs';

import { GET_handler, POST_handler } from '@/app/api/v2/products/validation/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.validation.POST',
});

export const GET = apiHandler(GET_handler, {
  source: 'v2.products.validation.GET',
});
