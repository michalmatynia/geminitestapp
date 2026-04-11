import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listLatestProductScansByProductIdsWithSync } from '@/features/products/server/product-scans-service';
import { productScanListResponseSchema } from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const csvStringArraySchema = z.preprocess(
  (value: unknown): unknown => {
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  },
  z.array(z.string().trim().min(1).max(160)).min(1).max(100)
);

export const querySchema = z.object({
  productIds: csvStringArraySchema,
});

export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });

  const scans = await listLatestProductScansByProductIdsWithSync({
    productIds: query.productIds,
  });

  return NextResponse.json(productScanListResponseSchema.parse({ scans }));
}
