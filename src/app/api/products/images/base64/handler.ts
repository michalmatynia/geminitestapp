import { NextRequest, NextResponse } from 'next/server';

import { parseJsonBody } from '@/features/products/server';
import { productBulkImagesBase64RequestSchema as bulkSchema } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, bulkSchema, {
    logPrefix: 'products.images.base64.bulk.POST',
  });
  if (!parsed.ok) return parsed.response;
  const { productIds } = parsed.data;
  if (!productIds.length) {
    throw badRequestError('No product ids provided');
  }

  const results = await Promise.allSettled(
    productIds.map((id: string) =>
      fetch(new URL(`/api/products/${id}/images/base64`, req.url), {
        method: 'POST',
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  const failed = failures.length;

  if (failed > 0) {
    const { logger } = await import('@/shared/utils/logger');
    logger.error(`[products.images.base64.bulk] ${failed} image conversions failed`, {
      failures: failures.map((f) => String(f.reason)),
      totalRequested: productIds.length,
    });
  }

  return NextResponse.json({
    status: 'ok',
    requested: productIds.length,
    succeeded,
    failed,
  });
}
