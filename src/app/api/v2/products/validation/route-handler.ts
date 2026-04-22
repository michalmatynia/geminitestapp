export const runtime = 'nodejs';

import { getHandler, postHandler } from '@/app/api/v2/products/validation/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.validation.POST',
  requireAuth: true,
});

export const GET = apiHandler(getHandler, {
  source: 'v2.products.validation.GET',
  requireAuth: true,
});
