import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext, JsonParseResult } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import {
  buildFilemakerMailForwardDraft,
  buildFilemakerMailReplyDraft,
  deleteFilemakerMailThread,
  getFilemakerMailThreadDetail,
  markFilemakerMailThreadRead,
} from '@/features/filemaker/server';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const filemakerMailThreadPatchSchema = z.object({
  read: z.boolean().optional(),
});

const resolveThreadId = (ctx: ApiHandlerContext): string => {
  const raw = Array.isArray(ctx.params?.['threadId'])
    ? (ctx.params?.['threadId'][0] ?? '')
    : (ctx.params?.['threadId'] ?? '');
  return decodeURIComponent(raw);
};

export async function getHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  const detail = await getFilemakerMailThreadDetail(threadId);
  if (!detail) {
    throw notFoundError('Filemaker mail thread was not found.');
  }
  const [forwardDraft, replyDraft] = await Promise.all([
    buildFilemakerMailForwardDraft(detail),
    buildFilemakerMailReplyDraft(detail),
  ]);
  return Response.json({
    detail,
    forwardDraft,
    replyDraft,
  });
}

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  const result: JsonParseResult<z.infer<typeof filemakerMailThreadPatchSchema>> =
    await parseJsonBody(req, filemakerMailThreadPatchSchema, {
      logPrefix: 'filemaker.mail.threads.PATCH',
    });
  if (!result.ok) {
    return result.response;
  }

  if (typeof result.data.read === 'boolean') {
    const thread = await markFilemakerMailThreadRead(threadId, result.data.read);
    return Response.json({ thread });
  }
  return Response.json({ ok: true });
}

export async function deleteHandler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const threadId = resolveThreadId(ctx);
  await deleteFilemakerMailThread(threadId);
  return Response.json({ ok: true });
}
