export const runtime = 'nodejs';

import { apiHandler } from '@/shared/lib/api/api-handler';

import { POST_handler } from '@/app/api/v2/products/images/base64/all/handler';

export const POST = apiHandler(POST_handler, {
  source: 'products.images.base64.all.POST',
});
