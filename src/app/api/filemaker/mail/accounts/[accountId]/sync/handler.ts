import { type NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import {
  enqueueFilemakerMailSyncJob,
  startFilemakerMailSyncQueue,
} from '@/server/queues/filemaker';

export async function postHandler(
  _req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const accountId = Array.isArray(ctx.params?.['accountId'])
    ? (ctx.params?.['accountId'][0] ?? '')
    : (ctx.params?.['accountId'] ?? '');
  const decodedAccountId = decodeURIComponent(accountId);
  startFilemakerMailSyncQueue();
  const dispatch = await enqueueFilemakerMailSyncJob({
    accountId: decodedAccountId,
    reason: 'manual',
  });

  return Response.json(dispatch, { status: 202 });
}
