import { NextRequest, NextResponse } from 'next/server';

import { parseJsonBody } from '@/features/products/server';
import { productBulkImagesBase64RequestSchema as bulkSchema } from '@/shared/contracts/products/product';
import { type ProductBulkImagesBase64Response } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
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
      fetch(new URL(`/api/v2/products/${id}/images/base64`, req.url), {
        method: 'POST',
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  const failed = failures.length;

  if (failed > 0) {
    const { logSystemEvent } = await import('@/shared/lib/observability/system-logger');
    await logSystemEvent({
      level: 'error',
      source: 'products.images.base64.bulk.POST',
      message: `${failed} image conversions failed`,
      context: {
        failures: failures.map((f) => String(f.reason)),
        totalRequested: productIds.length,
      },
    });
  }

  const response: ProductBulkImagesBase64Response = {
    status: 'ok',
    requested: productIds.length,
    succeeded,
    failed,
  };

  return NextResponse.json(response);
}
