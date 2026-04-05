import { NextRequest } from 'next/server';

import { filemakerMailAccountDraftSchema } from '@/shared/contracts/filemaker-mail';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { requireFilemakerMailAdminSession } from '@/features/filemaker/server';
import {
  listFilemakerMailAccounts,
  upsertFilemakerMailAccount,
} from '@/features/filemaker/server';

export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  return Response.json({
    accounts: await listFilemakerMailAccounts(),
  });
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireFilemakerMailAdminSession();
  const draft = filemakerMailAccountDraftSchema.parse(await req.json());
  const account = await upsertFilemakerMailAccount(draft);
  return Response.json({ account }, { status: 201 });
}

