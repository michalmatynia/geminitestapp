import { NextRequest } from 'next/server';

import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import {
  buildFilemakerMailReplyDraft,
  getFilemakerMailThreadDetail,
} from '@/features/filemaker/server/filemaker-mail-service';

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = Array.isArray(ctx.params?.['threadId'])
    ? (ctx.params?.['threadId'][0] ?? '')
    : (ctx.params?.['threadId'] ?? '');
  const decodedThreadId = decodeURIComponent(threadId);
  const detail = await getFilemakerMailThreadDetail(decodedThreadId);
  if (!detail) {
    throw notFoundError('Filemaker mail thread was not found.');
  }
  return Response.json({
    detail,
    replyDraft: await buildFilemakerMailReplyDraft(decodedThreadId),
  });
}

