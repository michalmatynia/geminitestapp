import { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import { syncFilemakerMailAccount } from '@/features/filemaker/server';

export async function POST_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = Array.isArray(ctx.params?.['accountId'])
    ? (ctx.params?.['accountId'][0] ?? '')
    : (ctx.params?.['accountId'] ?? '');
  return Response.json({
    result: await syncFilemakerMailAccount(decodeURIComponent(accountId)),
  });
}

