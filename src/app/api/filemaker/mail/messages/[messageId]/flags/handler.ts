import { type NextRequest } from 'next/server';

import { filemakerMailFlagPatchSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  requireFilemakerMailAdminSession,
  updateFilemakerMailMessageFlags,
} from '@/features/filemaker/server';

const resolveMessageId = (ctx: ApiHandlerContext): string => {
  const raw = Array.isArray(ctx.params?.['messageId'])
    ? (ctx.params?.['messageId'][0] ?? '')
    : (ctx.params?.['messageId'] ?? '');
  return decodeURIComponent(raw);
};

export async function patchHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const messageId = resolveMessageId(ctx);
  const patch = filemakerMailFlagPatchSchema.parse(await req.json());
  const message = await updateFilemakerMailMessageFlags(messageId, patch);
  return Response.json({ message });
}
