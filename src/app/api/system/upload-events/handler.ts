import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { listFileUploadEvents } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const parseDateParam = (value: string | null, endOfDay: boolean = false): Date | null => {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const uploadEventStatusSchema = z.preprocess((value) => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  return normalized === 'success' || normalized === 'error' ? normalized : undefined;
}, z.enum(['success', 'error']).optional());

export const querySchema = z.object({
  page: optionalIntegerQuerySchema(z.number().int().min(1)).default(1),
  pageSize: optionalIntegerQuerySchema(z.number().int().min(1)).default(50),
  status: uploadEventStatusSchema,
  category: optionalTrimmedQueryString(),
  projectId: optionalTrimmedQueryString(),
  query: optionalTrimmedQueryString(),
  from: optionalTrimmedQueryString(),
  to: optionalTrimmedQueryString(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = (req ? _ctx.query ?? {} : {}) as z.infer<typeof querySchema>;
  const from = parseDateParam(query.from ?? null);
  const to = parseDateParam(query.to ?? null, true);

  const result = await listFileUploadEvents({
    page: query.page,
    pageSize: query.pageSize,
    status: query.status ?? null,
    category: query.category ?? null,
    projectId: query.projectId ?? null,
    query: query.query ?? null,
    from,
    to,
  });

  return NextResponse.json(result);
}
