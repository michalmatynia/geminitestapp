import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { searchFilemakerMailMessages } from '@/features/filemaker/server';

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
