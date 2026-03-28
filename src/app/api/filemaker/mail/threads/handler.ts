import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { listFilemakerMailThreads } from '@/features/filemaker/server/filemaker-mail-service';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const query = req.nextUrl.searchParams.get('query');
  const accountId = req.nextUrl.searchParams.get('accountId');
  const mailboxPath = req.nextUrl.searchParams.get('mailboxPath');
  const input = {
    ...(query ? { query } : {}),
    ...(accountId ? { accountId } : {}),
    ...(mailboxPath ? { mailboxPath } : {}),
  };
  return Response.json({
    threads: await listFilemakerMailThreads(input),
  });
}
