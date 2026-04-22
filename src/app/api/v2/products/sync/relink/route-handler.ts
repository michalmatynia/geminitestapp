export const runtime = 'nodejs';

import { postHandler, relinkSchema } from '@/app/api/v2/products/sync/relink/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';


export const POST = apiHandler(postHandler, {
  source: 'v2.products.sync.relink.POST',
  parseJsonBody: true,
  bodySchema: relinkSchema,
  requireAuth: true,
});
