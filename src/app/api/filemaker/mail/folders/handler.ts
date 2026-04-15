import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { listFilemakerMailFolderSummaries } from '@/features/filemaker/server';

import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { z } from 'zod';

const querySchema = z.object({
  accountId: optionalTrimmedQueryString(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const { accountId } = querySchema.parse(Object.fromEntries(req.nextUrl.searchParams.entries()));
  return Response.json({
    folders: await listFilemakerMailFolderSummaries(accountId ? { accountId } : undefined),
  });
}
