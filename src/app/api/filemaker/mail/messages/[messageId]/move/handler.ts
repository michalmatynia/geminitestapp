import { type NextRequest } from 'next/server';
import { z } from 'zod';

import { filemakerMailFolderRoleSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  moveFilemakerMailMessage,
  requireFilemakerMailAdminSession,
} from '@/features/filemaker/server';

const requestSchema = z
  .object({
    targetMailboxPath: z.string().optional(),
    targetRole: filemakerMailFolderRoleSchema.optional(),
  })
  .refine(
    (data) => Boolean(data.targetMailboxPath) || Boolean(data.targetRole),
    { message: 'targetMailboxPath or targetRole is required.' }
  );

const resolveMessageId = (ctx: ApiHandlerContext): string => {
  const raw = Array.isArray(ctx.params?.['messageId'])
    ? (ctx.params?.['messageId'][0] ?? '')
    : (ctx.params?.['messageId'] ?? '');
  return decodeURIComponent(raw);
};

export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const messageId = resolveMessageId(ctx);
  const parsed = requestSchema.parse(await req.json());
  const message = await moveFilemakerMailMessage({
    messageId,
    targetMailboxPath: parsed.targetMailboxPath ?? null,
    targetRole: parsed.targetRole ?? null,
  });
  return Response.json({ message });
}
