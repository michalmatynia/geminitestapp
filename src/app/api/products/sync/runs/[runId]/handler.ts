import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getProductSyncRunDetail } from '@/features/product-sync/services/product-sync-repository';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

export const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(2_000).optional(),
  includeItems: z
    .enum(['true', 'false'])
    .optional()
    .transform((value: 'true' | 'false' | undefined): boolean | undefined => {
      if (value === undefined) return undefined;
      return value === 'true';
    }),
});

export async function GET_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const query = (ctx.query ?? {}) as z.infer<typeof querySchema>;
  const detail = await getProductSyncRunDetail(params.runId, {
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.pageSize !== undefined ? { pageSize: query.pageSize } : {}),
    ...(query.includeItems !== undefined
      ? { includeItems: query.includeItems }
      : {}),
  });

  if (!detail) {
    throw notFoundError('Sync run not found.', { runId: params.runId });
  }

  return NextResponse.json(detail, { headers: { 'Cache-Control': 'no-store' } });
}
