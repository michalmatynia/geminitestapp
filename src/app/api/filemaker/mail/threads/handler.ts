import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { listFilemakerMailThreads } from '@/features/filemaker/server';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { z } from 'zod';

const querySchema = z.object({
  query: optionalTrimmedQueryString(),
  accountId: optionalTrimmedQueryString(),
  mailboxPath: optionalTrimmedQueryString(),
});

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const { query, accountId, mailboxPath } = querySchema.parse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );
  const input = {
    ...(query ? { query } : {}),
    ...(accountId ? { accountId } : {}),
    ...(mailboxPath ? { mailboxPath } : {}),
  };
  return Response.json({
    threads: await listFilemakerMailThreads(input),
  });
}
