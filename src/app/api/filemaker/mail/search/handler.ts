import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import { searchFilemakerMailMessages } from '@/features/filemaker/server/filemaker-mail-service';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const query = req.nextUrl.searchParams.get('query') ?? '';
  const accountId = req.nextUrl.searchParams.get('accountId');
  const result = await searchFilemakerMailMessages({
    query,
    ...(accountId ? { accountId } : {}),
  });
  return Response.json(result);
}
