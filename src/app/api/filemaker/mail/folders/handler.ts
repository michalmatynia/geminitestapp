import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { listFilemakerMailFolderSummaries } from '@/features/filemaker/server/filemaker-mail-service';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = req.nextUrl.searchParams.get('accountId');
  return Response.json({
    folders: await listFilemakerMailFolderSummaries(accountId ? { accountId } : undefined),
  });
}
