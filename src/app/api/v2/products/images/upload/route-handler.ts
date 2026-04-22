export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { ProductsImagesUploadPOST } from '@/features/products/server';
import type { ApiRouteHandler } from '@/shared/contracts/ui/api';
import { authError } from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';

const postHandler: ApiRouteHandler = async (req, ctx): Promise<Response> => {
  if (!ctx.userId) {
    throw authError('Unauthorized.');
  }
  return ProductsImagesUploadPOST(req);
};

export const POST = apiHandler(postHandler, {
  source: 'v2.products.images.upload.POST',
  requireAuth: true,
  rateLimitKey: false,
});
