import { type NextRequest } from 'next/server';

import { filemakerMailAccountStatusSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession, updateFilemakerMailAccountStatus } from '@/features/filemaker/server';
import { z } from 'zod';

const requestSchema = z.object({
  status: filemakerMailAccountStatusSchema,
});

export async function patchHandler(
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const routeAccountId = ctx.params['accountId'];
  const accountId = Array.isArray(routeAccountId) ? (routeAccountId[0] ?? '') : routeAccountId;
  const { status } = requestSchema.parse(await req.json());

  return Response.json({
    account: await updateFilemakerMailAccountStatus(decodeURIComponent(accountId), status),
  });
}
