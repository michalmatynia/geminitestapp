export const runtime = 'nodejs';
export const revalidate = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, productTagCreateSchema } from '@/app/api/products/tags/handler';

export const GET = apiHandler(GET_handler, { source: 'products.tags.GET' });

export const POST = apiHandler(POST_handler, {
  source: 'products.tags.POST',
  parseJsonBody: true,
  bodySchema: productTagCreateSchema,
});
