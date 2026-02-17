export const runtime = 'nodejs';
export const revalidate = 300;

import { apiHandler } from '@/shared/lib/api/api-handler';

import { GET_handler, POST_handler, productParameterCreateSchema } from './handler';

export const GET = apiHandler(GET_handler, { source: 'products.parameters.GET' });

export const POST = apiHandler(POST_handler, {
  source: 'products.parameters.POST',
  parseJsonBody: true,
  bodySchema: productParameterCreateSchema,
});
