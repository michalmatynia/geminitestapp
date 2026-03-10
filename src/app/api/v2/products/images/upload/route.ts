export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { ProductsImagesUploadPOST } from '@/features/products/server';
import type { ApiRouteHandler } from '@/shared/contracts/ui';
import { authError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';

const POST_handler: ApiRouteHandler = async (req, ctx): Promise<Response> => {
  if (!ctx.userId) {
    throw authError('Unauthorized.');
  }
  return ProductsImagesUploadPOST(req);
};

export const POST = apiHandler(POST_handler, {
  source: 'v2.products.images.upload.POST',
  requireAuth: true,
  rateLimitKey: false,
});
