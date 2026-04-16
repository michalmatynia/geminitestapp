import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listProductScansWithSync } from '@/features/products/server/product-scans-service';
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
  z.array(z.string().trim().min(1).max(160)).max(100)
);

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
  ids: csvStringArraySchema.optional(),
  productIds: csvStringArraySchema.optional(),
  limit: positiveIntSchema.optional(),
});

export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse({
    ...Object.fromEntries(new URL(req.url).searchParams.entries()),
    ...((ctx.query ?? {}) as Record<string, unknown>),
  });

  const scans = await listProductScansWithSync({
    ids: query.ids,
    productIds: query.productIds,
    limit: query.limit ?? 50,
  });

  return NextResponse.json(productScanListResponseSchema.parse({ scans }));
}
