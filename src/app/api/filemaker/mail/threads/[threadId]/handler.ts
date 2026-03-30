import { NextRequest } from 'next/server';

import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server/filemaker-mail-access';
import {
  buildFilemakerMailReplyDraft,
  deleteFilemakerMailThread,
  getFilemakerMailThreadDetail,
  markFilemakerMailThreadRead,
} from '@/features/filemaker/server/filemaker-mail-service';

const resolveThreadId = (ctx: ApiHandlerContext): string => {
  const raw = Array.isArray(ctx.params?.['threadId'])
    ? (ctx.params?.['threadId'][0] ?? '')
    : (ctx.params?.['threadId'] ?? '');
  return decodeURIComponent(raw);
};

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  const detail = await getFilemakerMailThreadDetail(threadId);
  if (!detail) {
    throw notFoundError('Filemaker mail thread was not found.');
  }
  return Response.json({
    detail,
    replyDraft: await buildFilemakerMailReplyDraft(threadId),
  });
}

export async function PATCH_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  const body = (await req.json()) as { read?: boolean };
  if (typeof body.read === 'boolean') {
    const thread = await markFilemakerMailThreadRead(threadId, body.read);
    return Response.json({ thread });
  }
  return Response.json({ ok: true });
}

export async function DELETE_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  await deleteFilemakerMailThread(threadId);
  return Response.json({ ok: true });
}

