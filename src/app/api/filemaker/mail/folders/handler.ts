import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { listFilemakerMailFolderSummaries } from '@/features/filemaker/server';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = req.nextUrl.searchParams.get('accountId');
  return Response.json({
    folders: await listFilemakerMailFolderSummaries(accountId ? { accountId } : undefined),
  });
}
