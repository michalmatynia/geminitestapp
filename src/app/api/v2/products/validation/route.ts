export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler } from '@/app/api/products/validation/handler';

export const POST = apiHandler(POST_handler, {
  source: 'products.validation.POST',
});

export const GET = apiHandler(GET_handler, {
  source: 'products.validation.GET',
});
