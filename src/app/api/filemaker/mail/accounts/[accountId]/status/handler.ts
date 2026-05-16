import { type NextRequest } from 'next/server';

import { filemakerMailAccountStatusSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession, updateFilemakerMailAccountStatus } from '@/features/filemaker/server';
import { z } from 'zod';

const requestSchema = z.object({
  status: filemakerMailAccountStatusSchema,
});

const resolveAccountId = (ctx: ApiHandlerContext): string => {
  const value = ctx.params?.['accountId'];
  const raw = Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
  return decodeURIComponent(raw);
};

export async function patchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const { status } = requestSchema.parse(await req.json());

  return Response.json({
    account: await updateFilemakerMailAccountStatus(resolveAccountId(ctx), status),
  });
}
