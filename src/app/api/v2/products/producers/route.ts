export const runtime = 'nodejs';
export const revalidate = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, producerCreateSchema } from '@/app/api/v2/products/producers/handler';

export const GET = apiHandler(GET_handler, { source: 'products.producers.GET' });

export const POST = apiHandler(POST_handler, {
  source: 'products.producers.POST',
  parseJsonBody: true,
  bodySchema: producerCreateSchema,
});
