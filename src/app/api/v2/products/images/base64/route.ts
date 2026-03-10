export const runtime = 'nodejs';

import { POST_handler } from '@/app/api/v2/products/images/base64/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.images.base64.POST',
  requireAuth: true,
});
