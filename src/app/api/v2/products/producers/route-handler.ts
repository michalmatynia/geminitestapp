export const runtime = 'nodejs';
export const revalidate = 300;

import {
  getHandler,
  postHandler,
  producerCreateSchema,
} from '@/app/api/v2/products/producers/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const GET = apiHandler(getHandler, {
  source: 'v2.products.producers.GET',
  requireAuth: true,
});

export const POST = apiHandler(postHandler, {
  source: 'v2.products.producers.POST',
  parseJsonBody: true,
  bodySchema: producerCreateSchema,
  requireAuth: true,
});
