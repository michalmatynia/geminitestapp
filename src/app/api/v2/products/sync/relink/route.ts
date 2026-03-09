export const runtime = 'nodejs';

import { POST_handler, relinkSchema } from '@/app/api/v2/products/sync/relink/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(POST_handler, {
  source: 'v2.products.sync.relink.POST',
  parseJsonBody: true,
  bodySchema: relinkSchema,
});
