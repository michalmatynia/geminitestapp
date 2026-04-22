import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { searchFilemakerMailMessages } from '@/features/filemaker/server';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { z } from 'zod';

const querySchema = z.object({
  query: optionalTrimmedQueryString().default(''),
  accountId: optionalTrimmedQueryString(),
});

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const { query, accountId } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  const result = await searchFilemakerMailMessages({
    query,
    ...(accountId ? { accountId } : {}),
  });
  return Response.json(result);
}
