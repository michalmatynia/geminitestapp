import { NextRequest, NextResponse } from 'next/server';

import { getBaseImportRunDetailOrThrow } from '@/features/integrations/server';
import type {
  BaseImportItemStatus,
  BaseImportRunDetailResponse,
} from '@/shared/contracts/integrations';
import { baseImportRunDetailQuerySchema } from '@/shared/contracts/integrations';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const querySchema = baseImportRunDetailQuerySchema;

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams.entries()));
  const statusesRaw = parsed.success ? (parsed.data.statuses ?? '') : '';
  const statuses = statusesRaw
    .split(',')
    .map((value: string): string => value.trim())
    .filter((value: string): boolean => value.length > 0)
    .filter(
      (value: string): boolean =>
        value === 'pending' ||
        value === 'processing' ||
        value === 'imported' ||
        value === 'updated' ||
        value === 'skipped' ||
        value === 'failed'
    ) as BaseImportItemStatus[];
  const includeItems =
    parsed.success && parsed.data.includeItems ? parsed.data.includeItems === 'true' : undefined;
  const detail: BaseImportRunDetailResponse = await getBaseImportRunDetailOrThrow(params.runId, {
    ...(statuses.length > 0 ? { statuses } : {}),
    ...(parsed.success && typeof parsed.data.page === 'number' ? { page: parsed.data.page } : {}),
    ...(parsed.success && typeof parsed.data.pageSize === 'number'
      ? { pageSize: parsed.data.pageSize }
      : {}),
    ...(typeof includeItems === 'boolean' ? { includeItems } : {}),
  });
  return NextResponse.json(detail, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
