export const runtime = 'nodejs';

import {
  postHandler,
  productMarketplaceCopyDebrandRunRequestSchema,
} from '@/app/api/v2/products/marketplace-copy-debrand/run/handler';
import { apiHandler } from '@/shared/lib/api/api-handler';

export const POST = apiHandler(postHandler, {
  source: 'v2.products.marketplace-copy-debrand.run.POST',
  parseJsonBody: true,
  bodySchema: productMarketplaceCopyDebrandRunRequestSchema,
  requireAuth: true,
});
