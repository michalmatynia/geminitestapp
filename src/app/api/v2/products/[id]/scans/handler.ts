import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listProductScansWithSync } from '@/features/products/server/product-scans-service';
import { productScanListResponseSchema, productScanProviderSchema } from '@/shared/contracts/product-scans';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const positiveIntSchema = z.preprocess(
  (value: unknown) => {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return undefined;
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  },
  z.number().int().positive().max(200).optional()
);

export const querySchema = z.object({
  limit: positiveIntSchema.optional(),
  provider: productScanProviderSchema.optional(),
});

export async function GET_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });

  const scans = await listProductScansWithSync({
    productId: params.id,
    provider: query.provider ?? null,
    limit: query.limit ?? 50,
  });

  return NextResponse.json(productScanListResponseSchema.parse({ scans }));
}
